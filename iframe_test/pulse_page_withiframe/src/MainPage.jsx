import React from 'react';

const quickActions = [
  {
    title: 'Submit an Idea',
    description: 'Share initiatives that elevate the Pulse experience for our teams and clients.',
    actionLabel: 'Launch workspace',
  },
  {
    title: 'Request Support',
    description: 'Need help executing a program? Partner with our Center of Excellence specialists.',
    actionLabel: 'Open ticket',
  },
  {
    title: 'Learning Hub',
    description: 'Explore curated playbooks, recordings, and best practices for your next engagement.',
    actionLabel: 'Browse content',
  },
];

const resourceHighlights = [
  {
    heading: 'Enterprise News',
    body: 'Leadership shares the latest wins across Elevance Health, including new partnerships and expansion milestones.',
    linkLabel: 'Read full briefing',
  },
  {
    heading: 'Engagement Toolkit',
    body: 'Download templates, dashboards, and communications artifacts to accelerate launch and adoption.',
    linkLabel: 'View toolkit',
  },
];

const newsItems = [
  {
    title: 'Digital Care Navigation now live in four new markets',
    timestamp: 'Published 2 hours ago',
  },
  {
    title: 'Pulse AI copilots pilot receives 96% satisfaction rating from case managers',
    timestamp: 'Published yesterday',
  },
  {
    title: 'Community Connect launched for national brokers with new analytics dashboards',
    timestamp: 'Published 3 days ago',
  },
];

const MainPage = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#0F172A]">

      <main>
  <section className="bg-[#F9FAFB]">
          <div className="relative w-full overflow-hidden">
            <iframe
              src="http://localhost:3000/pulseembedded"
              title="Embedded App"
              className="block w-full h-[320px] border-0"
              allowFullScreen
            />
          </div>
        </section>

        <section className="bg-[#F9FAFB] px-8 pb-16 space-y-12">
          <div className="grid gap-6 lg:grid-cols-3">
            {quickActions.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-150"
              >
                <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Elevance Sans, sans-serif' }}>
                  {item.title}
                </h2>
                <p className="text-sm text-slate-600 leading-6 mb-6">{item.description}</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-[#2563EB] font-medium"
                  style={{ fontFamily: 'Elevance Sans, sans-serif' }}
                >
                  {item.actionLabel}
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-6">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Elevance Sans, sans-serif' }}>
                Highlights
              </h2>
              <div className="space-y-6">
                {resourceHighlights.map((resource) => (
                  <div key={resource.heading} className="space-y-3">
                    <h3 className="text-lg font-semibold" style={{ fontFamily: 'Elevance Sans, sans-serif' }}>
                      {resource.heading}
                    </h3>
                    <p className="text-sm text-slate-600 leading-6">{resource.body}</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-[#2563EB] font-medium"
                      style={{ fontFamily: 'Elevance Sans, sans-serif' }}
                    >
                      {resource.linkLabel}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-6" style={{ fontFamily: 'Elevance Sans, sans-serif' }}>
                Latest updates
              </h2>
              <ul className="space-y-5">
                {newsItems.map((news) => (
                  <li key={news.title} className="space-y-2">
                    <p className="font-medium" style={{ fontFamily: 'Elevance Sans, sans-serif' }}>
                      {news.title}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{news.timestamp}</p>
                    <div className="h-px w-full bg-slate-100" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MainPage;
