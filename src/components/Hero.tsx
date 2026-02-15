import heroImage from "@/assets/mosque-hero.jpg";
import AnnouncementBubble from "@/components/AnnouncementBubble";

const Hero = () => {
  return (
    <section className="relative h-[55vh] sm:h-[60vh] md:h-[70vh] overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
      </div>
      
      {/* Announcement bubble anchored at top */}
      <AnnouncementBubble />
      
      <div className="relative container h-full flex flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-3 md:mb-4 animate-fade-in [animation-fill-mode:backwards]">
          Welcome to Masjid Irshad
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-2xl animate-fade-in [animation-fill-mode:backwards]" style={{ animationDelay: "0.3s" }}>
          Serving and educating the Luton Muslim community
        </p>
      </div>
    </section>
  );
};

export default Hero;
