'use client'
import React, { useState, useEffect } from 'react';
import {
    MapPin, Sparkles, Camera, ArrowRight,
    CheckCircle2, X, Copy, Star,
    Flame, Zap, Send, Banknote, ShieldAlert
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

// --- Global Texture Overlay ---
const GrainOverlay = () => (
    <div className="fixed inset-0 z-[100] pointer-events-none opacity-20 mix-blend-soft-light"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
    </div>
);

const Navbar = ({ onOpenModal, onScrollToForm }) => (
    <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="bg-[#0E0E12]/80 backdrop-blur-xl border border-[#FF8C00]/20 rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl shadow-[#FF8C00]/10 pointer-events-auto">
            <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tighter text-[#FFFCE0]">
                    <img src="/OQ_LOGO_MAIN.svg" alt="OnQuest Logo" className="h-10 w-28" />
                </span>
            </div>

            <div className="hidden md:flex items-center gap-6">
                <a href="#how" className="text-sm font-bold text-[#FFFCE0]/70 hover:text-[#FFFCE0] transition-colors uppercase tracking-wider">The Tea ☕</a>
                <a href="#rule" className="text-sm font-bold text-[#FFFCE0]/70 hover:text-emerald-400 transition-colors uppercase tracking-wider">Rules</a>
                <button
                    onClick={onScrollToForm}
                    className="bg-emerald-400 text-[#0E0E12] px-6 py-2 rounded-full text-sm font-black uppercase tracking-wider hover:bg-emerald-300 transition-transform active:scale-95 shadow-[0_0_20px_-5px_theme(colors.emerald.400)]"
                >
                    Secure The Bag
                </button>
            </div>
        </div>
    </nav>
);

const Hero = ({ onScrollToForm }) => (
    <section className="relative min-h-screen flex items-start md:items-center justify-center overflow-hidden pt-32 pb-20">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
            {/* Extremely Gen-Z aesthetic Unsplash background */}
            <img
                src="https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=2679&auto=format&fit=crop"
                alt="Gen Z Aesthetics"
                className="w-full h-full object-cover object-center scale-105 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E12]/80 via-[#0E0E12]/90 to-[#0E0E12]" />
            <div className="absolute inset-0 bg-emerald-900/10 mix-blend-multiply" />
        </div>

        <div className="relative z-10 w-full container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                    <Zap size={14} className="text-emerald-400" />
                    1 Week Only • Free Money Glitch
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.95]">
                    STOP BEING AN <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 italic">NPC.</span>
                    <br />
                    GET PAID.
                </h1>

                <p className="text-xl md:text-2xl text-slate-300 leading-snug font-medium max-w-lg">
                    Cook a <strong className="text-white">W Quest</strong>. Pass our vibe check. We send <strong className="text-emerald-400">₹50</strong> straight to your UPI. Literally zero cap. 🧢
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                    <button
                        onClick={onScrollToForm}
                        className="px-8 py-5 bg-emerald-400 hover:bg-emerald-300 text-[#0E0E12] rounded-2xl font-black text-xl uppercase tracking-widest shadow-[0_0_40px_-10px_theme(colors.emerald.500)] transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                    >
                        I want ₹50
                        <ArrowRight size={24} />
                    </button>
                </div>

                <div className="flex items-center gap-6 pt-6 text-sm text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"><Banknote size={16} className="text-emerald-400" /> Instant UPI</span>
                    <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"><Flame size={16} className="text-red-400" /> 7 Days Only</span>
                </div>
            </div>

            {/* Glowing Graphic Side */}
            <div className="hidden lg:block relative mx-auto w-full max-w-sm">
                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-[3rem] blur-2xl opacity-40 animate-pulse"></div>
                <div className="relative bg-[#1A1A24]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl origin-bottom-right -rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-white font-black text-2xl uppercase italic">The Math</h3>
                        <div className="bg-emerald-500/20 p-3 rounded-2xl">
                            <Banknote className="text-emerald-400" size={28} />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                            <div className="text-3xl">📱</div>
                            <div>
                                <h4 className="text-white font-bold text-lg">1. Drop a Quest</h4>
                                <p className="text-sm text-slate-400">Share a spot.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                            <div className="text-3xl">✨</div>
                            <div>
                                <h4 className="text-white font-bold text-lg">2. QuestScore &gt; 70</h4>
                                <p className="text-sm text-slate-400">Pass the check.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30">
                            <div className="text-3xl">💸</div>
                            <div>
                                <h4 className="text-emerald-400 font-bold text-lg">3. +₹50</h4>
                                <p className="text-sm text-emerald-400/70">Hits your bank.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

const BentoCard = ({ icon: Icon, title, desc, className, image, highlightColor = "#FF8C00" }) => (
    <div className={`relative overflow-hidden rounded-[2.5rem] bg-[#1A1A24] border border-white/5 p-8 group hover:border-${highlightColor}/50 transition-all duration-500 ${className}`}
         style={{ '--hi-color': highlightColor }}>
        {image && (
            <img src={image} alt="bg" className="absolute inset-0 w-full h-full object-cover opacity-[0.15] group-hover:opacity-30 transition-opacity mix-blend-luminosity duration-700 block" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/80 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="w-16 h-16 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center mb-6 border border-white/10 group-hover:scale-110 transition-transform duration-500 overflow-hidden relative">
                {/* Dynamic colored glow inside icon box */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: highlightColor }} />
                <Icon size={32} style={{ color: highlightColor }} />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white mb-3 leading-tight uppercase italic drop-shadow-md">{title}</h3>
                <p className="text-slate-300 text-base leading-relaxed font-medium">{desc}</p>
            </div>
        </div>
    </div>
);

const ApplicationForm = () => {
    const [user] = useAuthState(auth);
    const [formData, setFormData] = useState({ name: '', upiId: '', phone: '', questLink: '', consent: false });
    const [status, setStatus] = useState('idle');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            alert("Bro, log in first to submit. 💀");
            return;
        }

        setStatus('submitting');

        try {
            await addDoc(collection(db, 'travel_applications'), {
                ...formData,
                uid: user.uid,
                createdAt: serverTimestamp(),
                source: 'live2travel_50inr',
                status: 'pending' // pending manual/automated QuestScore review
            });
            setStatus('success');
        } catch (error) {
            console.error("Error submitting: ", error);
            alert("Glitch in the matrix. Try again.");
            setStatus('idle');
        }
    };

    if (status === 'success') {
        return (
            <div className="text-center py-16 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
                <div className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-500 shadow-[0_0_50px_-10px_theme(colors.emerald.500)] relative overflow-hidden">
                     <div className="absolute inset-0 bg-emerald-400 opacity-20 animate-ping"></div>
                    <CheckCircle2 size={56} className="text-emerald-400 relative z-10" />
                </div>
                <h3 className="text-4xl font-black text-white mb-4 uppercase italic tracking-wider">Massive W!</h3>
                <p className="text-slate-300 mb-10 font-bold text-lg">Your Quest is under review. <br />If it bangs, expect ₹50 in your UPI soon. 💸</p>
                <button onClick={() => setStatus('idle')} className="text-emerald-400 font-black uppercase tracking-widest hover:text-emerald-300 transition-colors border-b-2 border-emerald-500/30 hover:border-emerald-400 pb-1">
                    Drop Another Quest
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center mb-2 pl-2">Name</label>
                    <input
                        required type="text" placeholder="John Doe"
                        className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-emerald-500 focus:bg-emerald-900/10 transition-all placeholder:text-white/20 font-bold text-lg"
                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center mb-2 pl-2"><Zap size={12} className="mr-1"/> UPI ID (Where we send the bag)</label>
                    <input
                        required type="text" placeholder="username@upi"
                        className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white focus:outline-none border-emerald-500/30 focus:border-emerald-500 focus:bg-emerald-900/10 transition-all placeholder:text-white/20 font-bold text-lg"
                        value={formData.upiId} onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 pl-2">WhatsApp Number</label>
                <input
                    required type="tel" placeholder="Used to notify you"
                    className="w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-emerald-500 focus:bg-emerald-900/10 transition-all placeholder:text-white/20 font-bold text-lg"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
            </div>


            {/* The Important Bit */}
            <div className="p-[2px] rounded-[1.5rem] bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-600 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity mix-blend-overlay"></div>
                <div className="bg-[#0E0E12] rounded-[1.4rem] p-6 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <Send className="text-emerald-400" size={24} />
                        <label className="text-base font-black text-white uppercase tracking-widest italic">The Quest Link</label>
                    </div>
                    <input
                        required type="url" placeholder="https://onquest.in/quest/..."
                        className="w-full bg-[#1A1A24] border-none rounded-xl p-5 text-emerald-50 focus:ring-2 focus:ring-emerald-400 placeholder:text-white/20 font-bold text-lg shadow-inner"
                        value={formData.questLink} onChange={(e) => setFormData({ ...formData, questLink: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex items-start gap-4 pt-4 px-2">
                <input
                    type="checkbox" required id="consent"
                    className="w-6 h-6 mt-1 rounded-md border-white/10 bg-black text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 focus:ring-2 cursor-pointer"
                    checked={formData.consent} onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                />
                <label htmlFor="consent" className="text-sm text-slate-400 cursor-pointer select-none font-bold leading-relaxed">
                    No CAP 🧢: I confirm this is a high-effort, original Quest. If it's pure garbage or fake, I get 0 rupees. I know the drill.
                </label>
            </div>

            <button
                disabled={status === 'submitting'}
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-[#0E0E12] py-6 rounded-2xl font-black text-2xl uppercase tracking-[0.2em] shadow-[0_0_40px_-10px_theme(colors.emerald.500)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-8 flex items-center justify-center gap-3 hover:shadow-[0_0_60px_-10px_theme(colors.emerald.500)]"
            >
                {status === 'submitting' ? 'Manifesting...' : 'Claim ₹50 💸'}
            </button>
        </form>
    );
};

export default function App() {
    const scrollToForm = () => {
        const el = document.getElementById('apply-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-[#0E0E12] text-[#FFFCE0] font-sans selection:bg-emerald-400 selection:text-[#0E0E12] overflow-x-hidden">
            <GrainOverlay />
            <Navbar onScrollToForm={scrollToForm} />
            <Hero onScrollToForm={scrollToForm} />

            {/* Feature Bento Grid */}
            <section id="how" className="py-24 px-4 relative z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="mb-20 flex flex-col items-center text-center">
                        <div className="inline-block bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                            How it works
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-white drop-shadow-2xl italic">
                            THE <span className="text-emerald-400">BLUEPRINT</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 auto-rows-[340px]">
                        <BentoCard
                            className="md:col-span-2"
                            title="1. Cook a Quest 👨‍🍳"
                            desc="Go to OnQuest. Make a Quest about any cool spot, cafe, or trip. Minimum 5 photos, accurate route, and 3 real, non-NPC tips."
                            icon={Flame}
                            image="https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=2000&auto=format&fit=crop"
                            highlightColor="#FF4500" // Red/Orange for cooking fire
                        />
                        <BentoCard
                            className="md:col-span-1"
                            title="2. The Vibe Check 📋"
                            desc="Our automated QuestScore checks for blurriness, AI-generated slop, and missing info."
                            icon={ShieldAlert}
                            image="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1500&auto=format&fit=crop"
                            highlightColor="#00E5FF" // Cyan for scanning/tech
                        />
                        <BentoCard
                            className="md:col-span-3 lg:col-span-3 bg-gradient-to-br from-[#1A1A24] to-[#0E1510] border-emerald-500/30"
                            title="3. Secure The Bag 💰"
                            desc="If you pass the check, we literally just send ₹50 to your UPI. Unlimited entries. Stop reading and start printing."
                            icon={Banknote}
                            highlightColor="#10B981" // Emerald
                            image="https://images.unsplash.com/photo-1612440306122-d7607fc5fdef?q=80&w=2670&auto=format&fit=crop"
                        />
                    </div>
                </div>
            </section>

            {/* The Rule Section */}
            <section id="rule" className="py-32 px-4 relative z-10 flex justify-center">
                <div className="max-w-4xl w-full">
                    <div className="relative bg-[#FFFAF0] text-[#0E0E12] rounded-[3rem] p-10 md:p-24 overflow-hidden transform -rotate-1 hover:rotate-1 transition-transform duration-700 shadow-[0_30px_60px_-20px_theme(colors.white/10)] border-[8px] border-[#0E0E12]">
                        <div className="text-center relative z-10">
                            <h2 className="text-xl font-black tracking-[0.4em] text-red-500 uppercase mb-8">Red Flags 🚩</h2>
                            <h3 className="text-5xl md:text-7xl font-black uppercase leading-[0.85] mb-12 italic">
                                DON'T DO <br />THIS STUFF.
                            </h3>

                            <div className="text-xl md:text-2xl font-black max-w-2xl mx-auto space-y-6 text-left">
                                <p className="flex items-start gap-4">
                                    <span className="text-red-500">❌</span> 
                                    <span>Posting blurry pics from your phone's 2018 gallery.</span>
                                </p>
                                <p className="flex items-start gap-4">
                                    <span className="text-red-500">❌</span> 
                                    <span>Using ChatGPT for description: "Nestled in the heart of the city..." STFU.</span>
                                </p>
                                <p className="flex items-start gap-4">
                                    <span className="text-red-500">❌</span> 
                                    <span>Missing location pins. How will anyone go there?</span>
                                </p>
                                <div className="mt-12 p-6 bg-red-500/10 rounded-2xl border border-red-500/20 text-center">
                                    <p className="text-lg text-red-700">If you do this, <strong className="font-black">QuestScore = 0</strong>. No money for you. 🤷‍♂️</p>
                                </div>
                            </div>
                        </div>
                        {/* Noise overlay */}
                        <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply"
                            style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}>
                        </div>
                    </div>
                </div>
            </section>

            {/* Form Section */}
            <section id="apply-section" className="py-32 px-4 relative z-10">
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent pointer-events-none" />
                
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="bg-[#101311] backdrop-blur-3xl border border-emerald-500/30 rounded-[3rem] p-8 md:p-16 shadow-2xl relative overflow-hidden">
                        
                        {/* Grid background for tech vibe */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                        <div className="mb-16 text-center relative z-10">
                            <div className="inline-flex items-center justify-center gap-2 bg-emerald-400 text-[#0E0E12] px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest mb-6 shadow-[0_0_20px_-5px_theme(colors.emerald.400)] animate-bounce">
                                <span>💰💰💰</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase italic tracking-tighter">Submit Link</h2>
                            <p className="text-slate-400 text-xl font-bold">Only drop the link if the Quest is fully cooked.</p>
                        </div>

                        <div className="relative z-10">
                            <ApplicationForm />
                        </div>
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/10 py-16 bg-[#0E0E12] text-center relative z-10">
                <div className="flex justify-center items-center gap-2 mb-6 opacity-30 hover:opacity-100 transition-opacity pb-6">
                    <img src="/OQ_LOGO_MAIN.svg" alt="OnQuest Logo" className="h-8 grayscale brightness-200" />
                </div>
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">© 2026 OnQuest. Secure the bag responsibly.</p>
                <p className="text-white/20 text-[10px] mt-2 max-w-md mx-auto">*T&C Apply. 1 Week Campaign. Fake or low-effort quests will be rejected. Don't try to game the system, we have devs.</p>
            </footer>
        </div>
    );
}