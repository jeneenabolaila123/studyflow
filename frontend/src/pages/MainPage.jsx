import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  FileText,
  GraduationCap,
  Layers,
  Menu,
  MessageCircle,
  Rocket,
  Sparkles,
  Star,
  Target,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";

import axiosClient from "../axiosClient";
import { useAuth } from "../auth/AuthContext.jsx";
import "../Main.css";

const navItems = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About" },
];

const fallbackFeedback = [
  {
    name: "Rana H.",
    role: "Computer Science Student",
    rating: 5,
    text: "StudyFlow helped me summarize long PDFs quickly and focus on the important exam points.",
  },
  {
    name: "Jeneen A.",
    role: "University Student",
    rating: 5,
    text: "The quiz feature made revision easier because I could practice directly from my notes.",
  },
  {
    name: "Ali M.",
    role: "CS Student",
    rating: 4,
    text: "Ask PDF saved me time because I could ask questions instead of reading the whole document again.",
  },
  {
    name: "Sara K.",
    role: "Student",
    rating: 5,
    text: "The recommendations helped me know what topics I should review before the exam.",
  },
];

const heroImageUrl =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85";

function initialsFor(name) {
  return String(name || "Student")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function IconBadge({ icon: Icon, tone = "blue" }) {
  return (
    <span className={`main-icon-badge main-icon-badge--${tone}`}>
      <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}

function RatingStars({ rating }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <span className="main-stars" aria-label={`${safeRating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={16}
          aria-hidden="true"
          className={index < safeRating ? "filled" : ""}
        />
      ))}
    </span>
  );
}

export default function MainPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const sectionRefs = useRef({});
  const [activeSection, setActiveSection] = useState("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState(fallbackFeedback);
  const [activeFeedback, setActiveFeedback] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);

  const ctaPath = token ? "/dashboard" : "/register";

  const heroCards = useMemo(
    () => [
      {
        title: "Summary",
        text: "AI-generated key points in seconds.",
        icon: FileText,
        tone: "purple",
        className: "summary",
      },
      {
        title: "Ask PDF",
        text: "Ask anything. Get instant answers.",
        icon: MessageCircle,
        tone: "blue",
        className: "ask",
      },
      {
        title: "Quiz",
        text: "Test your understanding with smart quizzes.",
        icon: FileQuestion,
        tone: "green",
        className: "quiz",
      },
      {
        title: "Recommendations",
        text: "AI suggests what to study next.",
        icon: Star,
        tone: "pink",
        className: "recommendations",
      },
      {
        title: "Study Plan",
        text: "Personalized plan to stay on track.",
        icon: CalendarCheck,
        tone: "orange",
        className: "plan",
      },
    ],
    []
  );

  const features = useMemo(
    () => [
      {
        title: "Smart PDF Assistant",
        description: "Ask questions and get accurate answers from your PDFs.",
        icon: MessageCircle,
        tone: "blue",
      },
      {
        title: "AI Summaries",
        description: "Get concise, accurate summaries in seconds.",
        icon: Sparkles,
        tone: "purple",
      },
      {
        title: "Exam-Style Quizzes",
        description: "Practice with quizzes designed like real exams.",
        icon: FileQuestion,
        tone: "green",
      },
      {
        title: "Personal Study Plan",
        description: "AI creates a custom plan based on your goals and schedule.",
        icon: CalendarCheck,
        tone: "orange",
      },
      {
        title: "Recommendations",
        description: "Smart suggestions to focus on what matters most.",
        icon: Star,
        tone: "pink",
      },
      {
        title: "All-in-One Platform",
        description: "Everything you need to study, all in one place.",
        icon: Layers,
        tone: "blue",
      },
    ],
    []
  );

  const steps = useMemo(
    () => [
      {
        title: "Upload Your Notes",
        description: "Upload PDFs or notes in seconds and let AI handle the rest.",
        icon: UploadCloud,
        tone: "blue",
      },
      {
        title: "Let AI Understand It",
        description: "Our AI reads, understands, and organizes your content instantly.",
        icon: Brain,
        tone: "purple",
      },
      {
        title: "Practice and Improve",
        description: "Study with summaries, quizzes, and personalized recommendations.",
        icon: Target,
        tone: "green",
      },
    ],
    []
  );

  const stats = useMemo(
    () => [
      { value: "20+", label: "AI Tools", icon: Sparkles, tone: "purple" },
      { value: "1,000+", label: "Smart Quizzes", icon: CheckCircle2, tone: "blue" },
      { value: "10M+", label: "PDFs Processed", icon: FileText, tone: "green" },
      { value: "50K+", label: "Study Plans Created", icon: CalendarCheck, tone: "orange" },
    ],
    []
  );

  const setSectionRef = (id) => (node) => {
    if (node) {
      sectionRefs.current[id] = node;
    }
  };

  const scrollToSection = (id) => {
    const section = sectionRefs.current[id] || document.getElementById(id);
    setActiveSection(id);
    setMobileNavOpen(false);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const goToCta = () => {
    navigate(ctaPath);
  };

  const nextFeedback = () => {
    setActiveFeedback((current) => (current + 1) % feedbacks.length);
  };

  const previousFeedback = () => {
    setActiveFeedback((current) => (current === 0 ? feedbacks.length - 1 : current - 1));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.08, 0.18, 0.35],
      }
    );

    navItems.forEach((item) => {
      const section = document.getElementById(item.id);
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFeedback = async () => {
      try {
        const response = await axiosClient.get("/feedback/recent", {
          params: { limit: 8 },
        });
        const payload = response?.data?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.feedback)
            ? payload.feedback
            : [];

        const mapped = list
          .map((item) => ({
            name: item.name || item.user_name || "StudyFlow Student",
            role: item.role || "StudyFlow Student",
            rating: item.rating || 5,
            text: item.message || item.text || item.feedback || "",
          }))
          .filter((item) => item.text.trim().length > 0);

        if (isMounted && mapped.length > 0) {
          setFeedbacks(mapped);
          setActiveFeedback(0);
        }
      } catch {
        if (isMounted) {
          setFeedbacks(fallbackFeedback);
        }
      }
    };

    loadFeedback();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (carouselPaused || feedbacks.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveFeedback((current) => (current + 1) % feedbacks.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [carouselPaused, feedbacks.length]);

  useEffect(() => {
    if (activeFeedback > feedbacks.length - 1) {
      setActiveFeedback(0);
    }
  }, [activeFeedback, feedbacks.length]);

  return (
    <div className="main-page">
      <header className="main-header">
        <div className="main-header-inner">
          <button
            type="button"
            className="main-logo"
            onClick={() => scrollToSection("home")}
            aria-label="Go to StudyFlow home"
          >
            <span className="main-logo-mark">S</span>
            <span>StudyFlow</span>
          </button>

          <nav className={`main-nav ${mobileNavOpen ? "open" : ""}`} aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={activeSection === item.id ? "active" : ""}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="main-header-actions">
            <button type="button" className="main-header-cta" onClick={goToCta}>
              Get Started
            </button>
            <button
              type="button"
              className="main-menu-toggle"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section id="home" ref={setSectionRef("home")} className="main-hero">
          <div className="main-container main-hero-grid">
            <div className="main-hero-copy">
              <p className="main-kicker">
                <Sparkles size={16} aria-hidden="true" />
                AI learning platform for students
              </p>
              <h1>
                Study smarter with <span>AI</span>, not harder.
              </h1>
              <p className="main-hero-subtitle">
                Upload your notes, generate summaries, ask questions from your PDF, and practice with smart quizzes - all in one learning platform.
              </p>

              <div className="main-hero-actions">
                <button type="button" className="main-button main-button-primary" onClick={goToCta}>
                  Get Started
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="main-button main-button-secondary"
                  onClick={() => scrollToSection("features")}
                >
                  Explore Features
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="main-loved-row" aria-label="Loved by 10,000 plus students">
                <div className="main-mini-avatars" aria-hidden="true">
                  {["R", "J", "A", "S", "M"].map((letter) => (
                    <span key={letter}>{letter}</span>
                  ))}
                </div>
                <RatingStars rating={5} />
                <span>Loved by 10,000+ students</span>
              </div>
            </div>

            <div className="main-hero-visual" aria-label="StudyFlow AI learning preview">
              <div className="main-hero-photo">
                <img src={heroImageUrl} alt="Students studying together with laptops" />
                <span className="main-ai-chip">
                  <Zap size={15} aria-hidden="true" />
                  AI Study Mode
                </span>
              </div>

              {heroCards.map((card) => (
                <article className={`main-floating-card ${card.className}`} key={card.title}>
                  <IconBadge icon={card.icon} tone={card.tone} />
                  <div>
                    <strong>{card.title}</strong>
                    <span>{card.text}</span>
                  </div>
                </article>
              ))}

              <article className="main-progress-card">
                <div className="main-progress-ring">
                  <span>78%</span>
                  <small>Complete</small>
                </div>
                <div className="main-progress-list">
                  <span><i className="purple" /> Summaries <b>12/16</b></span>
                  <span><i className="green" /> Quizzes <b>18/20</b></span>
                  <span><i className="blue" /> Study Plan <b>4/6</b></span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="main-feedback-section" aria-labelledby="feedback-title">
          <div className="main-container">
            <div className="main-section-heading">
              <p className="main-kicker">Student Feedback</p>
              <h2 id="feedback-title">Real study wins from StudyFlow users</h2>
            </div>

            <div
              className="main-carousel"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
            >
              <button
                type="button"
                className="main-carousel-arrow left"
                onClick={previousFeedback}
                aria-label="Previous feedback"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>

              <div className="main-carousel-window">
                <div
                  className="main-carousel-track"
                  style={{ transform: `translateX(-${activeFeedback * 100}%)` }}
                >
                  {feedbacks.map((feedback, index) => (
                    <article className="main-feedback-card" key={`${feedback.name}-${index}`}>
                      <div className="main-feedback-top">
                        <span className="main-feedback-avatar">{initialsFor(feedback.name)}</span>
                        <div>
                          <strong>{feedback.name}</strong>
                          <span>{feedback.role || "Student"}</span>
                        </div>
                      </div>
                      <RatingStars rating={feedback.rating || 5} />
                      <p>{feedback.text}</p>
                    </article>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="main-carousel-arrow right"
                onClick={nextFeedback}
                aria-label="Next feedback"
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>

              <div className="main-carousel-dots" aria-label="Feedback slides">
                {feedbacks.map((feedback, index) => (
                  <button
                    type="button"
                    key={`${feedback.name}-dot-${index}`}
                    className={activeFeedback === index ? "active" : ""}
                    onClick={() => setActiveFeedback(index)}
                    aria-label={`Show feedback ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" ref={setSectionRef("features")} className="main-section main-feature-section">
          <div className="main-container">
            <div className="main-section-heading">
              <h2>Why Choose <span>StudyFlow?</span></h2>
            </div>

            <div className="main-feature-grid">
              {features.map((feature) => (
                <article className="main-feature-card" key={feature.title}>
                  <IconBadge icon={feature.icon} tone={feature.tone} />
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" ref={setSectionRef("how-it-works")} className="main-section main-steps-section">
          <div className="main-container">
            <div className="main-section-heading">
              <h2>How <span>StudyFlow</span> Works</h2>
            </div>

            <div className="main-steps-row">
              {steps.map((step, index) => (
                <Fragment key={step.title}>
                  <article className="main-step-card">
                    <span className="main-step-number">0{index + 1}</span>
                    <IconBadge icon={step.icon} tone={step.tone} />
                    <div>
                      <h3>{index + 1}. {step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                  {index < steps.length - 1 ? (
                    <span className="main-step-arrow" aria-hidden="true">
                      <ArrowRight size={26} />
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section id="about" ref={setSectionRef("about")} className="main-section main-results-section">
          <div className="main-container main-results-grid">
            <div className="main-results-illustration" aria-hidden="true">
              <div className="main-book-stack">
                <GraduationCap size={76} />
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="main-results-copy">
              <h2>Built for Students Who Want <span>Better Results</span></h2>
              <p>
                StudyFlow helps you save time, understand lessons faster, and practice before exams using AI-powered tools.
              </p>
            </div>

            <div className="main-stats-grid">
              {stats.map((stat) => (
                <article className="main-stat-card" key={stat.label}>
                  <IconBadge icon={stat.icon} tone={stat.tone} />
                  <div>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="main-final-cta">
          <div className="main-container main-final-cta-inner">
            <div className="main-rocket-wrap" aria-hidden="true">
              <Rocket size={78} />
            </div>
            <div>
              <h2>Ready to make studying easier?</h2>
              <p>Join thousands of students who study smarter with StudyFlow.</p>
              <button type="button" className="main-button main-button-light" onClick={goToCta}>
                Start Now
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
