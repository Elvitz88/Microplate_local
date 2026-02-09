import { MdHelp, MdInfo } from 'react-icons/md';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="container-page">
        {}
        <div className="py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {}
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} HAllytics. All rights reserved.
              </p>
            </div>

            {}
            <div className="flex items-center gap-6 text-sm">
              <a href="/capture" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Dashboard
              </a>
              <a href="/results" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Results
              </a>
              <a href="/user-guide" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                <MdHelp className="h-4 w-4" />
                Guide
              </a>
            </div>

            {}
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <MdInfo className="h-4 w-4" />
              <span>v{process.env.APP_VERSION || '1.0.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
