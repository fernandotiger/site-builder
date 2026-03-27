const Privacy = () => {
  return (
    <div className="bg-gray-900 text-gray-200 font-sans leading-relaxed">

    <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="border-b border-gray-800 pb-8 mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-gray-400">Effective Date: March 27, 2026</p>
        </header>

        <section className="mb-8">
            <p className="mb-4">At <strong>Pagening</strong>, we respect your privacy and are committed to protecting your personal data. This policy explains how we handle your information when you use our AI landing page generator.</p>
        </section>

        <section className="mb-8 bg-gray-800/40 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">1. Data We Collect</h2>
            <p className="mb-4 text-gray-300">We limit our data collection to what is strictly necessary to provide our service:</p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>Identity Data:</strong> Your name as provided by you during registration.</li>
                <li><strong>Contact Data:</strong> Your email address for account login and essential communication.</li>
                <li><strong>User Content:</strong> The text, images, and configuration data you provide to generate and host your landing pages.</li>
            </ul>
        </section>

        <section className="mb-8 text-blue-100 bg-blue-900/20 p-6 rounded-lg border border-blue-900/50">
            <h2 className="text-xl font-semibold text-blue-400 mb-4">2. Cookies and Technical Tracking</h2>
            <p className="mb-4 font-medium">Our application uses cookies to function properly:</p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Used for "sessions" to keep you logged in.</li>
                <li><strong>Security:</strong> Used to prevent unauthorized access and protect your account (e.g., CSRF protection).</li>
                <li><strong>Preference:</strong> Used to remember your settings or language preferences.</li>
            </ul>
            <p className="mt-4 text-sm italic opacity-80">Note: We do not use third-party advertising cookies for tracking without your explicit consent.</p>
        </section>

        <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Data</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc ml-6 space-y-2 text-gray-300">
                <li>Create and manage your user account.</li>
                <li>Power the AI generation features of Pagening.</li>
                <li>Host your landing pages on our infrastructure.</li>
                <li>Send technical notices, security updates, and support messages.</li>
            </ul>
        </section>

        <section className="mb-8 border-t border-gray-800 pt-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>Protection:</strong> We implement industry-standard encryption (SSL/TLS) for data in transit.</li>
                <li><strong>Retention:</strong> We keep your data as long as your account is active. If you delete your account, we remove your personal data from our active databases within 30 days.</li>
            </ul>
        </section>

        <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Services</h2>
            <p className="mb-4">To provide our service, we may share limited data with:</p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>AI Providers:</strong> Prompts are sent to our AI partners for processing (personal identity data is not shared with them).</li>
                <li><strong>Hosting Providers:</strong> Your generated pages are stored on our secured cloud servers.</li>
            </ul>
        </section>

        <footer className="text-sm text-gray-500 mt-12 pt-8 border-t border-gray-800">
            <p>You have the right to access, correct, or delete your data at any time. For requests, please contact <a href="mailto:support@pagening.cloud" className="text-blue-400 hover:underline">support@pagening.cloud</a>.</p>
        </footer>
    </div>

</div>
  )
}

export default Privacy