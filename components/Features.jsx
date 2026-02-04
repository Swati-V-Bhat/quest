import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

const Features = () => {
    // Destructure both emblaRef and the emblaApi instance
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

    // State to manage which dot is currently selected
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Function to update the selectedIndex state when the carousel scrolls
    const onSelect = useCallback((emblaApi) => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, []);

    // Effect hook to initialize the event listener and clean it up
    useEffect(() => {
        if (!emblaApi) return;
        onSelect(emblaApi);
        emblaApi.on('select', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onSelect]);

    return (
        <>
            {/* Desktop/Laptop Layout */}
            <div id='introducing-quests' className="relative bg-cover bg-center h-auto flex flex-col items-center pt-10 ">
                <div className="absolute inset-0 bg-[url('/bgc.svg')] bg-cover bg-center opacity-50 z-9"></div>

                {/* Heading */}
                <h1 className='text-5xl md:text-7xl font-normal font-italic text-black leading-[1.1] tracking-tight font-mont z-50'>
                    Introducing
                    <span className='text-5xl md:text-7xl font-bold text-black leading-[1.1] tracking-tight font-mont z-50'> Quests</span>
                </h1>

                {/* Desktop layout */}
                <div className="hidden md:flex justify-center items-center gap-10 w-full max-w-5xl z-10 p-4">
                    <div className="flex-1 min-w-0 max-w-[45%] flex justify-center items-center">
                        <Image src="/Mobile1.svg" width={400} height={800} className="w-full h-auto object-contain" alt="Feature 1" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0 max-w-[45%] flex justify-center items-center">
                        <Image src="/Mobile2.svg" width={400} height={800} className="w-full h-auto object-contain" alt="Feature 2" loading="lazy" />
                    </div>
                </div>

                {/* Mobile/tablet swipeable layout (Embla Carousel) */}
                <div className="md:hidden w-full overflow-hidden z-10" ref={emblaRef}>
                    <div className="flex touch-pan-y">
                        <div className="flex-[0_0_100%] min-w-0 flex justify-center items-center">
                            <Image src="/Mobile1.svg" width={400} height={800} className="w-[80%] object-contain" alt="Feature 1" loading="lazy" />
                        </div>
                        <div className="flex-[0_0_100%] min-w-0 flex justify-center items-center">
                            <Image src="/Mobile2.svg" width={400} height={800} className="w-[80%] object-contain" alt="Feature 2" loading="lazy" />
                        </div>
                    </div>
                </div>

                {/* Dots for navigation */}
                <div className="md:hidden flex justify-center mt-4 z-10">
                    {/* Check that emblaApi exists before trying to call methods on it */}
                    {emblaApi && emblaApi.scrollSnapList().map((_, index) => (
                        <button
                            key={index}
                            onClick={() => emblaApi.scrollTo(index)}
                            // Use the selectedIndex state variable to determine active state
                            className={`w-2 h-2 mx-1 rounded-full ${index === selectedIndex ? 'bg-blue-500' : 'bg-gray-300'}`}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}

export default Features;
