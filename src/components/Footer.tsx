import { Link } from "react-router-dom";
import { Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#1a1f2e] text-white py-16">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          {/* Location */}
          <div>
            <h3 className="text-2xl font-bold mb-6 uppercase tracking-wider">Location</h3>
            <p className="text-lg leading-relaxed">
              Masjid Irshad<br />
              Luton<br />
              400 Dallow Rd, LU1 1UR
            </p>
          </div>

          {/* Our Hours */}
          <div>
          <h3 className="text-2xl font-bold mb-6 uppercase tracking-wider">Our Hours</h3>
            <p className="text-lg leading-relaxed">
              Open daily from<br />
              15 minutes before Fajr<br />
              until Isha prayer
            </p>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className="text-2xl font-bold mb-6 uppercase tracking-wider">Contact Us</h3>
            <div className="space-y-2">
              <Link 
                to="/contact" 
                className="text-lg leading-relaxed hover:text-primary transition-colors block"
              >
                Get in touch →
              </Link>
              <Link
                to="/feedback"
                className="text-lg leading-relaxed hover:text-primary transition-colors block"
              >
                Report Bug / Suggest Feature →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20 text-center space-y-2">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Masjid Irshad. All rights reserved.
          </p>
          <a 
            href="https://github.com/SaifHarding" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-white/50 transition-colors inline-flex items-center gap-1.5"
          >
            <Github className="w-3 h-3" />
            Built by SaifHarding
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
