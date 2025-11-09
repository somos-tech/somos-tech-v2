import { useEffect } from 'react';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';

export default function EventbriteWidget() {
    useEffect(() => {
        // Load Eventbrite widget script
        const script = document.createElement('script');
        script.src = 'https://www.eventbrite.com/static/widgets/eb_widgets.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <section className="relative py-16 z-10" style={{ backgroundColor: 'rgba(10, 31, 53, 0.9)' }}>
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4" 
                        style={{ color: '#00FF91', fontFamily: '"Courier New", monospace' }}>
                        upcomingEvents_
                    </h2>
                    <p className="text-lg" style={{ color: '#8394A7' }}>
                        Join us for workshops, networking, and community events
                    </p>
                </div>

                <div className="max-w-5xl mx-auto">
                    {/* Eventbrite Widget Container */}
                    <div 
                        className="rounded-xl overflow-hidden"
                        style={{ 
                            backgroundColor: 'rgba(5, 19, 35, 0.6)',
                            border: '1px solid rgba(0, 255, 145, 0.2)',
                        }}
                    >
                        <div id="eventbrite-widget-container-62095898743"></div>
                    </div>

                    {/* Eventbrite Script */}
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.EBWidgets.createWidget({
                                    widgetType: 'checkout',
                                    eventId: '62095898743',
                                    iframeContainerId: 'eventbrite-widget-container-62095898743',
                                    iframeContainerHeight: 425,
                                });
                            `
                        }}
                    />

                    {/* Manual Events List as Fallback/Additional Display */}
                    <div className="mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Event Card Template - Replace with actual events from Eventbrite API */}
                            <div 
                                className="p-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px]"
                                style={{ 
                                    backgroundColor: 'rgba(0, 255, 145, 0.05)',
                                    border: '1px solid rgba(0, 255, 145, 0.2)',
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    <div 
                                        className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: 'rgba(0, 255, 145, 0.2)' }}
                                    >
                                        <Calendar size={32} style={{ color: '#00FF91' }} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>
                                            View All Events
                                        </h3>
                                        <div className="flex items-center gap-2 mb-3">
                                            <MapPin size={16} style={{ color: '#8394A7' }} />
                                            <span className="text-sm" style={{ color: '#8394A7' }}>
                                                Virtual & In-Person
                                            </span>
                                        </div>
                                        <a
                                            href="https://www.eventbrite.com/o/somostech-62095898743"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105"
                                            style={{ 
                                                backgroundColor: '#00FF91',
                                                color: '#051323',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                            }}
                                        >
                                            See All Events
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Info Card */}
                            <div 
                                className="p-6 rounded-xl"
                                style={{ 
                                    backgroundColor: 'rgba(2, 219, 255, 0.05)',
                                    border: '1px solid rgba(2, 219, 255, 0.2)',
                                }}
                            >
                                <h3 className="text-lg font-bold mb-3" style={{ color: '#02DBFF' }}>
                                    Stay Connected
                                </h3>
                                <p className="text-sm mb-4" style={{ color: '#8394A7' }}>
                                    Don't miss out on workshops, networking sessions, and tech talks. 
                                    Follow us on Eventbrite to get notified about new events.
                                </p>
                                <a
                                    href="https://www.eventbrite.com/o/somostech-62095898743"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:scale-105"
                                    style={{ 
                                        backgroundColor: '#02DBFF',
                                        color: '#051323',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                    }}
                                >
                                    Follow on Eventbrite
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
