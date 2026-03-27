
const Terms = () => {
  return (
    <div className="bg-gray-900 text-gray-200 font-sans leading-relaxed">

    <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="border-b border-gray-800 pb-8 mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
            <p className="text-gray-400">Effective Date: March 27, 2026</p>
        </header>

        <section className="mb-8">
            <p className="mb-4">Welcome to <strong>Pagening</strong>. By using our platform to generate, edit, and host landing pages, you agree to the following terms. If you do not agree, please do not use our services.</p>
        </section>

        <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Description of Service</h2>
            <p>Pagening provides AI-powered tools to generate landing pages, image upload capabilities, and hosting services. We provide the infrastructure; you provide the intent and the final review of all content.</p>
        </section>

        <section className="mb-8 text-red-100 bg-red-900/20 p-6 rounded-lg border border-red-900/50">
            <h2 className="text-xl font-semibold text-red-400 mb-4">2. User Responsibilities & Prohibited Conduct</h2>
            <p className="mb-4 font-medium">As a user, you retain full responsibility for any content published through our service. You strictly agree NOT to:</p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>Engage in Illegal Activity:</strong> Use the service for fraud, phishing, selling illegal goods, or distributing malware.</li>
                <li><strong>Deceive or Mislead:</strong> Create "scam" pages, impersonate other brands, or use "dark patterns" to trick consumers.</li>
                <li><strong>Infringe Intellectual Property:</strong> Upload images or text that you do not own the rights to.</li>
                <li><strong>Post Harmful Content:</strong> Host material that is defamatory, obscene, or promotes hate speech.</li>
            </ul>
        </section>

        <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. AI-Generated Content Disclaimer</h2>
            <p className="mb-4">Our platform utilizes Artificial Intelligence to assist in page creation. You acknowledge and agree that:</p>
            <ul className="list-disc ml-6 space-y-2 text-gray-300">
                <li><strong>Accuracy:</strong> AI can produce factual errors or "hallucinations."</li>
                <li><strong>Vetting:</strong> It is <strong>your sole responsibility</strong> to review, edit, and verify all AI-generated text and layouts before publishing.</li>
                <li><strong>No Warranty:</strong> We do not guarantee that the AI-generated content is fit for a particular legal or commercial purpose.</li>
            </ul>
        </section>

        <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Hosting and Custom Domains</h2>
            <p className="mb-4">While we provide hosting and allow custom domain integration:</p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>Availability:</strong> We strive for high uptime but do not guarantee uninterrupted service.</li>
                <li><strong>Right to Terminate:</strong> We reserve the right to take down any landing page or suspend accounts that violate these terms or receive valid legal complaints (e.g., DMCA notices) without prior notice.</li>
            </ul>
        </section>

        <section className="mb-8 border-t border-gray-800 pt-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Limitation of Liability</h2>
            <p className="italic mb-4 text-gray-400">To the maximum extent permitted by law:</p>
            <ul className="list-disc ml-6 space-y-2">
                <li><strong>Indemnification:</strong> You agree to indemnify and hold harmless Pagening from any claims or legal fees arising from your use of the service or the content on your landing pages.</li>
                <li><strong>"As-Is" Basis:</strong> The service is provided "as-is." Pagening shall not be liable for any loss of profits, data, or reputation resulting from your use of the platform.</li>
            </ul>
        </section>

        <footer className="text-sm text-gray-500 mt-12">
            <p>If you have questions regarding these terms, please contact <a href="mailto:support@pagening.cloud" className="text-blue-400 hover:underline">support@pagening.cloud</a>.</p>
        </footer>
    </div>

</div>
  )
}

export default Terms