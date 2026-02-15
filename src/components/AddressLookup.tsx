import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBackendClient } from "@/lib/backendClient";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Suggestion {
  address: string;
  id: string;
}

interface AddressLookupProps {
  address: string;
  town: string;
  postcode: string;
  onAddressChange: (address: string) => void;
  onTownChange: (town: string) => void;
  onPostcodeChange: (postcode: string) => void;
  required?: boolean;
  addressLabel?: string;
  townLabel?: string;
  postcodeLabel?: string;
}

export const AddressLookup = ({
  address,
  town,
  postcode,
  onAddressChange,
  onTownChange,
  onPostcodeChange,
  required = true,
  addressLabel = "Address",
  townLabel = "Town/City",
  postcodeLabel = "Postcode",
}: AddressLookupProps) => {
  const supabase = getBackendClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showManualFields, setShowManualFields] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show manual fields if address is already filled (e.g. from previous lookup)
  const hasAddress = address || town || postcode;

  // Debounced search with proper cleanup
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    debounceRef.current = setTimeout(async () => {
      // Check if aborted before making request
      if (abortController.signal.aborted) return;

      try {
        const { data, error } = await supabase.functions.invoke('address-lookup', {
          body: { query: searchQuery }
        });

        // Check if aborted after request completes
        if (abortController.signal.aborted) return;

        if (error) {
          console.error("Address lookup error:", error);
          setIsSearching(false);
          return;
        }

        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setIsOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        // Don't log abort errors
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error("Address lookup error:", err);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortController.abort();
    };
  }, [searchQuery]);

  const handleSelectAddress = async (suggestion: Suggestion) => {
    // Cancel any pending searches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsSelecting(true);
    setIsOpen(false);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const { data, error } = await supabase.functions.invoke('address-lookup', {
        body: { addressId: suggestion.id }
      });

      // Check if aborted
      if (abortController.signal.aborted) return;

      if (error) {
        console.error("Address fetch error:", error);
        return;
      }

      if (data.address) {
        const addr = data.address;
        // Combine address lines, filtering out empty ones
        const addressLines = [
          addr.line_1,
          addr.line_2,
          addr.line_3,
          addr.line_4,
        ].filter(line => line).join(', ');

        onAddressChange(addressLines);
        onTownChange(addr.town_or_city);
        onPostcodeChange(addr.postcode);
        setSearchQuery("");
        setSuggestions([]);
        setShowManualFields(true);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error("Address fetch error:", err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsSelecting(false);
      }
    }
  };

  const handleEnterManually = () => {
    setShowManualFields(true);
  };

  return (
    <div className="space-y-4">
      {/* Address Search - only show if no address yet */}
      {!hasAddress && !showManualFields && (
        <div className="space-y-2">
          <Label>Find Address *</Label>
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Start typing your postcode or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              className="pr-10 h-11"
            />
            {isSearching || isSelecting ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            
            {/* Dropdown for suggestions */}
            {isOpen && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 top-full left-0 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-1">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Select an address</p>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id || index}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectAddress(suggestion)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-left hover:bg-accent rounded-sm cursor-pointer"
                    >
                      <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>{suggestion.address}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button 
            type="button" 
            variant="link" 
            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
            onClick={handleEnterManually}
            tabIndex={-1}
          >
            Enter address manually
          </Button>
        </div>
      )}

      {/* Manual Address Fields - show after selection or manual entry */}
      {(hasAddress || showManualFields) && (
        <>
          <div className="space-y-2">
            <Label htmlFor="address">
              {addressLabel} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              required={required}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="town">
                {townLabel} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="town"
                value={town}
                onChange={(e) => onTownChange(e.target.value)}
                required={required}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">
                {postcodeLabel} {required && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => onPostcodeChange(e.target.value.toUpperCase())}
                required={required}
                maxLength={8}
                className="h-11"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};