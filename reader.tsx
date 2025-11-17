import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore
import { Readability } from './vendor/Readability.js';

const browser = (window as any).browser;

const App: React.FC = () => {
    const [article, setArticle] = useState<{ title: string; content: string; byline: string | null; siteName: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const articleUrl = params.get('url');

        if (!articleUrl) {
            setError('No URL provided to parse.');
            setLoading(false);
            return;
        }

        setUrl(articleUrl);
        document.title = `Reading: ${articleUrl}`;

        const fetchAndParse = async () => {
            try {
                if (!browser || !browser.runtime || !browser.runtime.sendMessage) {
                    throw new Error("This feature is only available when running as a Firefox extension. The preview environment does not have the necessary permissions to fetch external web pages.");
                }

                const response = await browser.runtime.sendMessage({
                    action: "getPageContent",
                    url: articleUrl
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                // We need to create a new document to parse the string, as Readability expects a DOM document
                const doc = new DOMParser().parseFromString(response.content, 'text/html');
                const reader = new Readability(doc);
                const parsedArticle = reader.parse();

                if (!parsedArticle || !parsedArticle.content) {
                    throw new Error('Could not extract article content. This page might not be a standard article.');
                }

                // Extract pure text only - no HTML formatting
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = parsedArticle.content;
                const pureText = tempDiv.textContent || tempDiv.innerText || '';

                // Replace the HTML content with pure text
                setArticle({
                    ...parsedArticle,
                    content: pureText
                });
                document.title = parsedArticle.title || document.title;

            } catch (err: any) {
                setError(err.message || 'Failed to fetch or parse the article.');
            } finally {
                setLoading(false);
            }
        };

        fetchAndParse();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
                <svg className="h-12 w-12 animate-spin mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                <p>Fetching and parsing article...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto p-8 text-center">
                 <h1 className="text-3xl font-bold mb-4 text-red-600 dark:text-red-400">Could Not Parse Article</h1>
                 <p className="text-lg mb-4 text-gray-600 dark:text-gray-300">{error}</p>
                 {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Try opening the original page instead.</a>}
            </div>
        );
    }

    return (
        <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
            <article className="prose prose-lg dark:prose-invert mx-auto">
                <header className="mb-8">
                    <h1 className="!mb-2">{article?.title}</h1>
                    {article?.byline && <p className="text-base italic !mt-2 text-gray-600 dark:text-gray-400">{article.byline}</p>}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        From <a href={url!} target="_blank" rel="noopener noreferrer">{article?.siteName || new URL(url!).hostname}</a>
                    </p>
                </header>
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{article?.content || ''}</pre>
            </article>
        </main>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount reader app to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);