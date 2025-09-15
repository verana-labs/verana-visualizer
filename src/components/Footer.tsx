'use client'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-black border-t border-gray-200 dark:border-dark-border">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Specifications */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Specifications
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://verana-labs.github.io/verifiable-trust-spec/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  Verifiable Trust
                </a>
              </li>
              <li>
                <a
                  href="https://verana-labs.github.io/verifiable-trust-vpr-spec/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  Verifiable Public Registry
                </a>
              </li>
              <li>
                <a
                  href="https://trustoverip.github.io/tswg-trust-registry-protocol/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  Trust Registry Query Protocol
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Community
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://www.linkedin.com/company/verana-verifiable-trust-network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/edjaFn252q"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/verana-labs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* About Verana */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              About Verana
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://verana.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  Verana Verifiable Trust Network
                </a>
              </li>
              <li>
                <a
                  href="https://verana.foundation/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-verana-accent transition-colors"
                >
                  Foundation Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-dark-border">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            ©{currentYear} Verana Foundation
          </p>
        </div>
      </div>
    </footer>
  )
}
