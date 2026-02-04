import React from 'react';

const TermsPage = () => {
    return (
        <div className="min-h-screen bg-black text-gray-300 p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="border-b border-gray-800 pb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
                    <p className="text-gray-400">Last Updated: {new Date().toLocaleDateString()}</p>
                </header>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-white">1. Agreement to Terms</h2>
                    <p>
                        By accessing or using OnQuest, you agree to be bound by these Terms of Service and our Privacy Policy.
                        If you do not agree to these terms, please do not use our services.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-white">2. User Accounts</h2>
                    <p>
                        When you create an account with us, you must provide information that is accurate, complete, and current at all times.
                        Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-white">3. Content</h2>
                    <p>
                        Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content").
                        You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
                    </p>
                    <p>
                        By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-white">4. Intellectual Property</h2>
                    <p>
                        The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of OnQuest and its licensors.
                        The Service is protected by copyright, trademark, and other laws of both India and foreign countries.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-white">5. Termination</h2>
                    <p>
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-white">6. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us at: <a href="mailto:support@onquest.in" className="text-orange-500 hover:text-orange-400">support@onquest.in</a>
                    </p>
                </section>
            </div>
        </div>
    );
};

export default TermsPage;
