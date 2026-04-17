'use client'
import React, { useState, useEffect } from 'react';
import {
    MapPin, Play, ArrowRight, Mouse, CheckCircle2,
    Compass, LayoutTemplate, Users, Check,
    BarChart, Image as ImageIcon, MessageSquare, Plus, DollarSign
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';

const Navbar = ({ onScrollToForm }) => {
    const router = useRouter();
    const [user] = useAuthState(auth);
    
    return (
        <nav className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                {/* Simulated Logo based on image: On in white, Quest in orange */}
                <span className="text-2xl font-black tracking-tight text-white">
                    On<span className="text-[#F97316]">Quest</span>
                </span>
            </div>
            
            {!user ? (
                <button
                    onClick={() => router.push('/signIn')}
                    className="bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                    Login
                </button>
            ) : (
                <button
                    onClick={() => router.push('/profile')}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 border border-white/20 rounded-lg font-semibold backdrop-blur-sm transition-all"
                >
                    Profile
                </button>
            )}
        </nav>
    );
};

const Hero = ({ onScrollToForm }) => (
    <section className="relative min-h-[100vh] flex flex-col justify-center items-center text-center px-4 overflow-hidden">
        {/* Background dark mountain road image */}
        <div className="absolute inset-0 z-0">
            <img
                src="https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=2000&auto=format&fit=crop"
                alt="Mountains Background"
                className="w-full h-full object-cover opacity-30 object-bottom scale-105"
            />
            {/* The signature blue outer glow vignette and heavy dark gradients */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 flex-1 to-[#0a0a0a]" />
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 150px rgba(30, 64, 175, 0.2)' }}></div>
        </div>

        <div className="relative z-10 max-w-4xl pt-20">
            <div className="flex justify-center mb-6">
                <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-medium backdrop-blur-sm">
                    Live2Travel by OnQuest
                </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
                Turn Your Travel into <br className="hidden md:block"/>
                <span className="text-[#F97316]">Real Money</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#A1A1AA] mb-10 max-w-2xl mx-auto font-medium">
                Create structured travel experiences on OnQuest and earn ₹100 for every approved Quest.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={onScrollToForm}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-semibold shadow-lg shadow-[#F97316]/20 transition-all flex items-center justify-center gap-2 group"
                >
                    Start Creating Quests
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                    onClick={() => alert("Example Quest feature coming soon!")}
                    className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-white/20 hover:bg-white/10 text-white rounded-xl font-semibold backdrop-blur-sm transition-all flex items-center justify-center gap-2"
                >
                    <Play size={18} />
                    View Example Quest
                </button>
            </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 flex flex-col items-center gap-2">
            <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1">
                <div className="w-1 h-2 bg-[#F97316] rounded-full animate-bounce" />
            </div>
        </div>
    </section>
);

const SectionHeading = ({ title, subtitle }) => (
    <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{title}</h2>
        {subtitle && <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">{subtitle}</p>}
    </div>
);

const BentoCard = ({ icon: Icon, title, desc }) => (
    <div className="bg-[#121212]/80 backdrop-blur-lg border border-white/5 p-8 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
        <div className="bg-[#F97316]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
            <Icon size={24} className="text-[#F97316]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-[#A1A1AA] leading-relaxed">{desc}</p>
    </div>
);

const TimelineStep = ({ num, title, desc }) => (
    <div className="flex gap-6 relative pb-12 last:pb-0">
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-white/20 bg-[#121212] flex items-center justify-center text-[#A1A1AA] font-mono text-sm z-10 shrink-0">
                0{num}
            </div>
            {num !== 5 && <div className="absolute top-12 bottom-0 w-[1px] bg-white/10" />}
        </div>
        <div className="pt-2">
            <h4 className="text-lg font-bold text-white mb-2">{title}</h4>
            <p className="text-[#A1A1AA]">{desc}</p>
        </div>
    </div>
);

const ApplicationForm = () => {
    const [user] = useAuthState(auth);
    const [formData, setFormData] = useState({ name: '', upiId: '', email: '', phone: '', questLink: '' });
    const [status, setStatus] = useState('idle');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("Please login via OnQuest first to link your account.");
            return;
        }

        setStatus('submitting');
        try {
            await addDoc(collection(db, 'travel_applications'), {
                ...formData,
                uid: user.uid,
                createdAt: serverTimestamp(),
                source: 'live2travel_lovable',
                payout: 100,
                status: 'pending' 
            });
            setStatus('success');
        } catch (error) {
            console.error("Error submitting: ", error);
            alert("Form error. Please try again.");
            setStatus('idle');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-16 bg-[#121212] border border-white/10 rounded-2xl max-w-xl mx-auto my-12 animate-in fade-in">
                <CheckCircle2 size={64} className="text-[#10B981] mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">Quest Submitted Successfully</h3>
                <p className="text-[#A1A1AA] mb-8">Our team will review your structured itinerary. Once approved, ₹100 will be credited to your UPI.</p>
                <button onClick={() => setStatus('idle')} className="text-[#F97316] hover:underline font-medium">
                    Submit Another Quest
                </button>
            </div>
        );
    }

    return (
        <div id="apply-form" className="max-w-2xl mx-auto my-24 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-[#F97316]/5 blur-[100px] rounded-full pointer-events-none" />
            <h3 className="text-3xl font-bold text-white mb-2 text-center">Start Earning Now</h3>
            <p className="text-[#A1A1AA] text-center mb-10">Transform your travel experiences into valuable Quests and get rewarded for your expertise.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Full Name</label>
                        <input
                            required type="text" placeholder="John Doe"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#F97316] transition-colors"
                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">UPI ID for Payout</label>
                        <input
                            required type="text" placeholder="username@upi"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:outline-none flex-1 focus:border-[#F97316] transition-colors"
                            value={formData.upiId} onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">Account Email</label>
                        <input
                            required type="email" placeholder="john@example.com"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#F97316] transition-colors"
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#A1A1AA]">WhatsApp Number</label>
                        <input
                            required type="tel" placeholder="For updates"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#F97316] transition-colors"
                            value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                        <MapPin size={16} className="text-[#F97316]" /> Link to your live OnQuest itinerary
                    </label>
                    <input
                        required type="url" placeholder="https://onquest.in/quest/..."
                        className="w-full bg-[#0a0a0a] border border-[#F97316]/50 rounded-xl p-4 text-white focus:outline-none focus:border-[#F97316] transition-colors focus:ring-1 focus:ring-[#F97316]"
                        value={formData.questLink} onChange={(e) => setFormData({ ...formData, questLink: e.target.value })}
                    />
                </div>

                <button
                    disabled={status === 'submitting'}
                    className="w-full bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:opacity-90 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-[#F97316]/20 transition-all disabled:opacity-50 mt-6"
                >
                    {status === 'submitting' ? 'Submitting...' : 'Submit Quest & Earn ₹100'}
                </button>
            </form>
        </div>
    );
};

export default function ReplicatedLovablePage() {
    const scrollToForm = () => {
        const el = document.getElementById('apply-form');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#F97316] selection:text-white">
            <Navbar onScrollToForm={scrollToForm} />
            <Hero onScrollToForm={scrollToForm} />

            {/* What is OnQuest? */}
            <section className="py-24 px-4 max-w-6xl mx-auto">
                <SectionHeading 
                    title="What is OnQuest?" 
                    subtitle="A social platform for travelers where people share real travel experiences in a structured, easy-to-follow format called Quests."
                />
                <div className="grid md:grid-cols-3 gap-6">
                    <BentoCard 
                        icon={LayoutTemplate} 
                        title="Structured, Not Random" 
                        desc="Not random blogs or reels — organized, actionable travel itineraries."
                    />
                    <BentoCard 
                        icon={Compass} 
                        title="Actionable Itineraries" 
                        desc="Real routes, stops, timings and logistics that anyone can follow directly."
                    />
                    <BentoCard 
                        icon={Users} 
                        title="Built for Real Travelers" 
                        desc="A community of doers, not influencers. Your authentic experience matters most."
                    />
                </div>
            </section>

            {/* What is a Quest? */}
            <section className="py-24 px-4 bg-[#121212]/50 border-y border-white/5 relative">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">What is a Quest?</h2>
                        <p className="text-[#A1A1AA] text-lg mb-8 leading-relaxed">
                            A Quest is a complete travel plan — structured step-by-step with locations, flow, and map integration.
                        </p>
                        
                        <div className="space-y-6">
                            {[
                                "Day-by-day or step-by-step flow",
                                "Real insights — routes, stops, timings",
                                "Map integration — can be followed by anyone"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="bg-[#F97316]/10 p-2 rounded-full border border-[#F97316]/20">
                                        <Check size={18} className="text-[#F97316]" />
                                    </div>
                                    <span className="text-white text-lg font-medium">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Simulated Mobile Mockup */}
                    <div className="relative mx-auto w-full max-w-sm rounded-[2.5rem] border-[8px] border-[#1f1f1f] bg-black overflow-hidden shadow-2xl">
                        <img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=2070&auto=format&fit=crop" className="w-full h-[600px] object-cover opacity-80" alt="App preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-8">
                            <h3 className="text-2xl font-bold mb-2">Bali Roadtrip</h3>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white/20 rounded-full text-xs backdrop-blur-md border border-white/10">3 Days</span>
                                <span className="px-3 py-1 bg-[#F97316]/80 text-white rounded-full text-xs backdrop-blur-md shadow-lg">12 Stops</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

             {/* Earn & Quality Section */}
             <section className="py-24 px-4 max-w-6xl mx-auto">
                <SectionHeading 
                    title="Get Paid to Share Your Travel" 
                    subtitle="Earn ₹100 for every Quest that meets our quality criteria. No followers needed, just great experiences."
                />
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
                    <div className="p-8 pb-12 rounded-2xl bg-gradient-to-b from-[#121212] to-[#0a0a0a] border border-white/5 relative overflow-hidden group hover:border-[#F97316]/30 transition-colors">
                        <DollarSign className="text-[#F97316] w-8 h-8 mb-4 opacity-80 group-hover:scale-110 transition-transform"/>
                        <h4 className="text-xl font-bold mb-2">₹100 per Quest</h4>
                        <p className="text-[#A1A1AA] text-sm">Reliable earnings for quality work every time.</p>
                    </div>
                    <div className="p-8 pb-12 rounded-2xl bg-gradient-to-b from-[#121212] to-[#0a0a0a] border border-white/5 relative overflow-hidden group hover:border-[#F97316]/30 transition-colors">
                        <Star className="text-[#F97316] w-8 h-8 mb-4 opacity-80 group-hover:scale-110 transition-transform"/>
                        <h4 className="text-xl font-bold mb-2">Quality First</h4>
                        <p className="text-[#A1A1AA] text-sm">We value actionable detail over celebrity status.</p>
                    </div>
                    <div className="p-8 pb-12 rounded-2xl bg-gradient-to-b from-[#121212] to-[#0a0a0a] border border-white/5 relative overflow-hidden group hover:border-[#F97316]/30 transition-colors">
                        <BarChart className="text-[#F97316] w-8 h-8 mb-4 opacity-80 group-hover:scale-110 transition-transform"/>
                        <h4 className="text-xl font-bold mb-2">Transparent Process</h4>
                        <p className="text-[#A1A1AA] text-sm">Fast reviews, clear feedback, immediate payouts.</p>
                    </div>
                </div>

                <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What is a Quest Score?</h2>
                    <p className="text-[#A1A1AA] text-lg mb-12 max-w-3xl">Every Quest is evaluated by our backend with a Quest Score. A higher score means a better, more useful Quest.</p>
                    
                    <div className="grid md:grid-cols-3 gap-8 mb-10">
                        <div>
                            <div className="w-10 h-10 bg-[#F97316]/10 rounded-full flex items-center justify-center mb-4 text-[#F97316]"><MapPin size={20}/></div>
                            <h4 className="font-bold text-white mb-2">More = Better</h4>
                            <p className="text-sm text-[#A1A1AA]">Add more waypoints for a better score.</p>
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-[#F97316]/10 rounded-full flex items-center justify-center mb-4 text-[#F97316]"><MessageSquare size={20}/></div>
                            <h4 className="font-bold text-white mb-2">Clarity Wins</h4>
                            <p className="text-sm text-[#A1A1AA]">Include helpful logistical metadata (costs, transit).</p>
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-[#F97316]/10 rounded-full flex items-center justify-center mb-4 text-[#F97316]"><ImageIcon size={20}/></div>
                            <h4 className="font-bold text-white mb-2">Show, Don't Tell</h4>
                            <p className="text-sm text-[#A1A1AA]">Upload multiple real photos per waypoint.</p>
                        </div>
                    </div>
                    
                    <div className="bg-[#0a0a0a] border border-[#F97316]/20 py-4 px-6 rounded-xl flex items-center gap-4">
                        <span className="text-[#F97316] font-bold">Pro Tip:</span>
                        <span className="text-[#A1A1AA] text-sm md:text-base">Add 8+ waypoints, write clear descriptions, and upload multiple photos per stop.</span>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 px-4 bg-[#121212]/30 border-t border-white/5">
                <div className="max-w-2xl mx-auto">
                    <SectionHeading title="How It Works" />
                    
                    <div className="pl-4 md:pl-16">
                        <TimelineStep 
                            num="1" title="Sign Up" 
                            desc="Create your free account on OnQuest." 
                        />
                        <TimelineStep 
                            num="2" title="Create Your Quest" 
                            desc="Build a structured itinerary from your recent travel." 
                        />
                        <TimelineStep 
                            num="3" title="Post It" 
                            desc="Publish your Quest to the OnQuest community." 
                        />
                        <TimelineStep 
                            num="4" title="We Review" 
                            desc="Our internal team checks quality, structure, and Quest Score." 
                        />
                        <TimelineStep 
                            num="5" title="Get ₹100" 
                            desc="If approved, the money is wired to your account." 
                        />
                    </div>
                </div>
            </section>

            {/* Application Form */}
            <div className="px-4">
                <ApplicationForm />
            </div>

            <footer className="py-12 border-t border-white/10 text-center">
                <p className="text-[#A1A1AA] text-sm">© {new Date().getFullYear()} OnQuest. All rights reserved.</p>
            </footer>
        </div>
    );
}

// Ensure lucide icon 'Star' is imported near the top, I realize I might have missed it, adding a fallback just in case or we can just use another icon, but lucide has Star.
// Re-checking imports, I have: MapPin, Play, ArrowRight, Mouse, CheckCircle2, Compass, LayoutTemplate, Users, Check, BarChart, Image as ImageIcon, MessageSquare, Plus, DollarSign
// adding a small local component for Star since I can't overwrite imports mid-file simply.
const Star = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);