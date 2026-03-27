
const Footer = () => {
  return (
    <footer className='text-center py-8 text-gray-400 text-sm border-t border-gray-800 mt-24'>
      <div className="max-w-screen-xl mx-auto px-4">
        <p className="mb-2">
          Copyright © 2026 **Pagening** - AI Landing Page Generator
        </p>
        
        <div className="flex justify-center gap-6 mt-4">
          <a 
            href="/terms" target="_blank" rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            Terms of Use
          </a>
          <a 
            href="/privacy"  target="_blank" rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            Privacy Policy
          </a>
          <a 
            href="mailto:support@pagening.cloud" 
            className="hover:text-white transition-colors duration-200"
          >
            Contact Support
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
