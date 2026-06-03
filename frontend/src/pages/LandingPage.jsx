import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

function SparklesIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
        </svg>
    );
}

function QuizIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m3-11H6a2 2 0 00-2 2v14l4-3 4 3 4-3 4 3V7a2 2 0 00-2-2z"
            />
        </svg>
    );
}

function ChatIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h8m-8 4h5m-7 7l4-4h10a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        </svg>
    );
}

function TargetIcon() {
    return (
        <svg
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.975a1 1 0 00.95.69h4.184c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.975c.3.921-.755 1.688-1.538 1.118l-3.385-2.46a1 1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.197-1.538-1.118l1.286-3.975a1 1 0 00-.364-1.118L2.04 9.402c-.783-.57-.38-1.81.588-1.81h4.184a1 1 0 00.95-.69l1.286-3.975z"
            />
        </svg>
    );
}

function FeatureCard({ icon, iconClassName, title, description }) {
    return (
        <div className="card card-hover flex flex-col gap-3 p-4 sm:p-5">
            <div className={`stat-icon ${iconClassName} h-11 w-11`}>
                {icon}
            </div>
            <div
                className="text-[15px] font-semibold tracking-[-0.2px]"
                style={{ color: "var(--color-text)" }}
            >
                {title}
            </div>
            <div className="text-[13px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {description}
            </div>
        </div>
    );
}

function StarIcon({ filled = true }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.975a1 1 0 00.95.69h4.184c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.975c.3.921-.755 1.688-1.538 1.118l-3.385-2.46a1 1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.197-1.538-1.118l1.286-3.975a1 1 0 00-.364-1.118L2.04 9.402c-.783-.57-.38-1.81.588-1.81h4.184a1 1 0 00.95-.69l1.286-3.975z"
            />
        </svg>
    );
}

function ArrowIcon({ direction = "right" }) {
    const rotate = direction === "left" ? "rotate(180deg)" : "none";
    return (
        <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: rotate }}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
            />
        </svg>
    );
}

function TestimonialsCarousel() {
    const trackRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const testimonials = useMemo(
        () => [
            {
                name: "Ayesha K.",
                message:
                    "I uploaded my lecture notes and got a clean summary + quiz in minutes. It made revision way less stressful.",
                rating: 5,
            },
            {
                name: "Omar S.",
                message:
                    "The ‘Ask PDF’ feels like having a study buddy. I can quickly clarify concepts without jumping between tabs.",
                rating: 5,
            },
            {
                name: "Sara M.",
                message:
                    "The recommendations helped me focus on weak topics before exams. My practice sessions became more targeted.",
                rating: 5,
            },
            {
                name: "Hassan R.",
                message:
                    "Quizzes are surprisingly good for quick checks. I use it after every chapter to confirm what I actually understand.",
                rating: 5,
            },
            {
                name: "Noor A.",
                message:
                    "Everything looks clean and fast. It feels like a premium study app — not a messy tool.",
                rating: 5,
            },
        ],
        []
    );

    const scrollToIndex = (index) => {
        const track = trackRef.current;
        if (!track) return;
        const cards = Array.from(track.querySelectorAll("[data-tcard='1']"));
        const clamped = Math.max(0, Math.min(index, cards.length - 1));
        const el = cards[clamped];
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
        setActiveIndex(clamped);
    };

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        let raf = 0;
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const cards = Array.from(track.querySelectorAll("[data-tcard='1']"));
                if (!cards.length) return;

                const left = track.getBoundingClientRect().left;
                let nearest = 0;
                let nearestDist = Number.POSITIVE_INFINITY;

                cards.forEach((card, i) => {
                    const dist = Math.abs(card.getBoundingClientRect().left - left);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = i;
                    }
                });

                setActiveIndex(nearest);
            });
        };

        track.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            cancelAnimationFrame(raf);
            track.removeEventListener("scroll", onScroll);
        };
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <div className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
                    Feedback
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-icon"
                        onClick={() => scrollToIndex(activeIndex - 1)}
                        aria-label="Previous testimonial"
                        title="Previous"
                    >
                        <ArrowIcon direction="left" />
                    </button>
                    <button
                        type="button"
                        className="btn btn-icon"
                        onClick={() => scrollToIndex(activeIndex + 1)}
                        aria-label="Next testimonial"
                        title="Next"
                    >
                        <ArrowIcon direction="right" />
                    </button>
                </div>
            </div>

            <div
                ref={trackRef}
                className="mt-5 flex gap-4 overflow-x-auto scroll-smooth pb-4"
                style={{ scrollSnapType: "x mandatory" }}
            >
                {testimonials.map((t) => (
                    <div
                        key={t.name}
                        data-tcard="1"
                        className="min-w-[86%] max-w-[86%] sm:min-w-[520px] sm:max-w-[520px]"
                        style={{ scrollSnapAlign: "start" }}
                    >
                        <div className="card card-hover h-full p-5 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div
                                    className="truncate text-[13.5px] font-semibold"
                                    style={{ color: "var(--color-text)" }}
                                >
                                    {t.name}
                                </div>
                                <div
                                    className="flex items-center gap-1"
                                    style={{ color: "var(--color-accent)" }}
                                    aria-label={`${t.rating} out of 5 stars`}
                                >
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <StarIcon key={i} filled={i < t.rating} />
                                    ))}
                                </div>
                            </div>
                            <div
                                className="mt-4 text-[13px] leading-relaxed"
                                style={{ color: "var(--color-muted)" }}
                            >
                                {t.message}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
                {testimonials.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => scrollToIndex(i)}
                        aria-label={`Go to testimonial ${i + 1}`}
                        className="h-2.5 w-2.5 rounded-full transition"
                        style={{
                            background:
                                i === activeIndex
                                    ? "var(--color-accent)"
                                    : "var(--color-border)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default function LandingPage() {
    const containerClass = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:px-10";

    return (
        <div style={{ background: "var(--color-bg)" }}>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div
                    className="relative"
                    style={{
                        background: "var(--color-sidebar)",
                    }}
                >
                    {/* Soft gradient accents */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.28), transparent 60%), radial-gradient(circle at 80% 60%, rgba(139, 92, 246, 0.22), transparent 55%)",
                        }}
                    />

                    <div className={`relative ${containerClass} py-16 sm:py-24 lg:py-28 xl:py-32`}>
                        <div className="mx-auto max-w-2xl text-center">
                            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                                Study Smarter with AI
                            </h1>
                            <p className="mt-4 text-pretty text-[13.5px] leading-relaxed text-white/70 sm:mt-5 sm:text-[15px]">
                                Upload your notes, generate summaries, quizzes, and ask questions instantly.
                            </p>

                            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 md:flex-row md:items-center">
                                <Link to="/register" className="btn btn-primary btn-lg w-full sm:w-auto">
                                    Get Started
                                </Link>
                                <Link to="/login" className="btn btn-secondary btn-lg w-full sm:w-auto">
                                    Try Demo
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className={containerClass}>
                {/* Features */}
                <section id="features" className="py-14 sm:py-20 lg:py-24 xl:py-28">
                    <div className="mb-8 text-center sm:mb-10">
                        <div className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
                            Features
                        </div>
                        <div
                            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
                            style={{ color: "var(--color-text)" }}
                        >
                            Simple tools that keep you consistent
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:gap-7">
                        <FeatureCard
                            icon={<SparklesIcon />}
                            iconClassName="stat-icon-purple"
                            title="AI Summaries"
                            description="Instantly summarize your notes"
                        />
                        <FeatureCard
                            icon={<QuizIcon />}
                            iconClassName="stat-icon-blue"
                            title="Quiz Generation"
                            description="Generate MCQs automatically"
                        />
                        <FeatureCard
                            icon={<ChatIcon />}
                            iconClassName="stat-icon-green"
                            title="Ask PDF"
                            description="Chat with your study material"
                        />
                        <FeatureCard
                            icon={<TargetIcon />}
                            iconClassName="stat-icon-orange"
                            title="Recommendations"
                            description="Improve weak topics"
                        />
                    </div>
                </section>

                {/* About */}
                <section id="about" className="pb-14 sm:pb-20 lg:pb-24 xl:pb-28">
                    <div className="card p-5 sm:p-7 lg:p-8">
                        <div className="text-center">
                            <div
                                className="text-[12px] font-semibold"
                                style={{ color: "var(--color-muted)" }}
                            >
                                About Us
                            </div>
                            <div
                                className="mt-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
                                style={{ color: "var(--color-text)" }}
                            >
                                Built for calm, focused studying
                            </div>
                            <p
                                className="mx-auto mt-4 max-w-2xl text-[13.5px] leading-relaxed sm:text-[14px]"
                                style={{ color: "var(--color-muted)" }}
                            >
                                StudyFlow helps you learn faster by turning your notes into clear summaries, practice quizzes,
                                and instant answers — so you spend less time organizing and more time understanding.
                            </p>

                            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                                <span className="badge badge-default">Faster revision</span>
                                <span className="badge badge-default">Better practice</span>
                                <span className="badge badge-default">Clear focus</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feedback */}
                <section id="feedback" className="pb-14 sm:pb-20 lg:pb-24 xl:pb-28">
                    <div className="mb-7 text-center sm:mb-8">
                        <div className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
                            Feedback
                        </div>
                        <div
                            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
                            style={{ color: "var(--color-text)" }}
                        >
                            Students love the flow
                        </div>
                    </div>
                    <TestimonialsCarousel />
                </section>

                {/* CTA */}
                <section className="pb-14 sm:pb-20 lg:pb-24 xl:pb-28">
                    <div
                        className="card text-center p-6 sm:p-8 lg:p-10"
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(99, 102, 241, 0.09), rgba(139, 92, 246, 0.07))",
                        }}
                    >
                        <div
                            className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
                            style={{ color: "var(--color-text)" }}
                        >
                            Start learning smarter today
                        </div>
                        <div className="mt-7 sm:mt-8">
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="pb-12">
                    <div
                        className="flex flex-col items-start justify-between gap-3 border-t pt-8 sm:flex-row sm:items-center"
                        style={{ borderColor: "var(--color-border)" }}
                    >
                        <div className="text-[12.5px]" style={{ color: "var(--color-muted)" }}>
                            © {new Date().getFullYear()} StudyFlow
                        </div>
                        <div className="flex items-center gap-4">
                            <a
                                href="#about"
                                className="text-[13px] hover:underline"
                                style={{ color: "var(--color-muted)" }}
                            >
                                About
                            </a>
                            <a
                                href="#feedback"
                                className="text-[13px] hover:underline"
                                style={{ color: "var(--color-muted)" }}
                            >
                                Feedback
                            </a>
                            <a
                                href="mailto:contact@studyflow.app"
                                className="text-[13px] hover:underline"
                                style={{ color: "var(--color-muted)" }}
                            >
                                Contact
                            </a>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] hover:underline"
                                style={{ color: "var(--color-muted)" }}
                            >
                                GitHub
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
