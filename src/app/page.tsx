"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Intersection Observer for reveal animations
    const revealElements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --green: #0d433b;
          --green-deep: #092e28;
          --green-light: #145c52;
          --gold: #fac922;
          --gold-dim: rgba(250, 201, 34, 0.15);
          --gold-glow: rgba(250, 201, 34, 0.4);
          --white: #fffffe;
          --off-white: #f4f2ed;
          --text-muted: rgba(255, 255, 254, 0.65);
          --text-light: rgba(255, 255, 254, 0.85);
          --card-shadow: 0 15px 45px rgba(0, 0, 0, 0.25);
          --soft-border: 1px solid rgba(250, 201, 34, 0.08);
          --hero-gradient: radial-gradient(
              ellipse at 20% 50%,
              rgba(20, 92, 82, 0.4) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse at 80% 30%,
              rgba(250, 201, 34, 0.08) 0%,
              transparent 50%
            ),
            var(--green-deep);
        }

        .landing-page * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-page {
          font-family: "Source Sans 3", sans-serif;
          background: var(--green-deep);
          color: var(--white);
          overflow-x: hidden;
        }

        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 1.25rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(9, 46, 40, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(250, 201, 34, 0.08);
          transition: all 0.4s ease;
        }

        .landing-nav.scrolled {
          padding: 0.8rem 3rem;
          background: rgba(9, 46, 40, 0.95);
        }

        .nav-logo {
          height: auto;
          width: auto;
          max-height: 56px;
          max-width: min(44vw, 520px);
          object-fit: contain;
          display: block;
          transition: max-height 0.4s ease;
        }

        .landing-nav.scrolled .nav-logo {
          max-height: 46px;
        }

        .nav-links {
          display: flex;
          gap: 1.75rem;
          list-style: none;
        }

        .nav-links a {
          color: var(--text-light);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.3s;
          position: relative;
        }

        .nav-links a::after {
          content: "";
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 1.5px;
          background: var(--gold);
          transition: width 0.3s ease;
        }

        .nav-links a:hover {
          color: var(--gold);
        }
        .nav-links a:hover::after {
          width: 100%;
        }

        .nav-cta {
          padding: 0.55rem 1.5rem;
          background: transparent;
          border: 1.5px solid var(--gold);
          color: var(--gold) !important;
          border-radius: 2px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-cta:hover {
          background: var(--gold) !important;
          color: var(--green-deep) !important;
        }

        .nav-cta::after {
          display: none !important;
        }

        .nav-toggle {
          display: none;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 254, 0.2);
          color: var(--white);
          padding: 0.45rem 0.7rem;
          border-radius: 2px;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          background: var(--hero-gradient);
        }

        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
              rgba(250, 201, 34, 0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(250, 201, 34, 0.03) 1px,
              transparent 1px
            );
          background-size: 60px 60px;
          animation: gridShift 20s linear infinite;
        }

        @keyframes gridShift {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(60px, 60px);
          }
        }

        .hero-pins {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .pin {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--gold);
          opacity: 0.5;
          animation: pinPulse 4s ease-in-out infinite;
        }

        .pin::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1.5px solid var(--gold);
          opacity: 0;
          animation: pinRing 4s ease-out infinite;
        }

        @keyframes pinPulse {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.5);
          }
          20%,
          80% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes pinRing {
          0%,
          100% {
            opacity: 0;
            transform: scale(1);
          }
          20% {
            opacity: 0.5;
            transform: scale(1);
          }
          80% {
            opacity: 0;
            transform: scale(2.5);
          }
        }

        .pin:nth-child(1) {
          top: 20%;
          left: 15%;
          animation-delay: 0s;
        }
        .pin:nth-child(2) {
          top: 35%;
          left: 65%;
          animation-delay: 0.8s;
        }
        .pin:nth-child(3) {
          top: 60%;
          left: 30%;
          animation-delay: 1.6s;
        }
        .pin:nth-child(4) {
          top: 25%;
          left: 80%;
          animation-delay: 2.4s;
        }
        .pin:nth-child(5) {
          top: 70%;
          left: 75%;
          animation-delay: 3.2s;
        }
        .pin:nth-child(6) {
          top: 45%;
          left: 45%;
          animation-delay: 1.2s;
        }
        .pin:nth-child(7) {
          top: 80%;
          left: 20%;
          animation-delay: 2s;
        }
        .pin:nth-child(8) {
          top: 15%;
          left: 50%;
          animation-delay: 0.4s;
        }

        .hero-inner {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: center;
          width: 100%;
          gap: 3rem;
          padding: 0 3rem;
          z-index: 2;
        }

        .hero-content {
          position: relative;
          max-width: 800px;
          margin-left: 8%;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          background: var(--gold-dim);
          border: 1px solid rgba(250, 201, 34, 0.2);
          border-radius: 2px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 2rem;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeUp 0.8s ease forwards 0.3s;
        }

        .hero-badge::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
          animation: badgeDot 2s ease-in-out infinite;
        }

        @keyframes badgeDot {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .hero h1 {
          font-family: "Playfair Display", serif;
          font-size: clamp(2.8rem, 5.5vw, 4.5rem);
          font-weight: 700;
          line-height: 1.08;
          margin-bottom: 1.5rem;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.9s ease forwards 0.5s;
        }

        .hero h1 .gold {
          color: var(--gold);
        }

        .hero-subtitle {
          font-size: 1.15rem;
          font-weight: 300;
          line-height: 1.7;
          color: var(--text-light);
          max-width: 560px;
          margin-bottom: 2.5rem;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.9s ease forwards 0.7s;
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.9s ease forwards 0.9s;
        }

        .hero-proof {
          display: grid;
          grid-template-columns: repeat(3, auto);
          gap: 1.5rem;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          color: var(--text-light);
        }

        .hero-proof span {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          background: rgba(255, 255, 254, 0.05);
          border: 1px solid rgba(255, 255, 254, 0.08);
          border-radius: 2px;
          letter-spacing: 0.05em;
        }

        .hero-visual {
          position: relative;
          align-self: stretch;
          display: flex;
          justify-content: center;
        }

        .hero-visual-card {
          width: min(520px, 90%);
          aspect-ratio: 4 / 3;
          background: linear-gradient(
            135deg,
            rgba(250, 201, 34, 0.08),
            rgba(13, 67, 59, 0.8)
          );
          border-radius: 6px;
          border: var(--soft-border);
          box-shadow: var(--card-shadow);
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-visual-card::after {
          content: "Interactive Map";
          position: absolute;
          left: 50%;
          bottom: 12px;
          transform: translateX(-50%);
          padding: 0.45rem 0.8rem;
          background: rgba(9, 46, 40, 0.7);
          border: 1px solid rgba(250, 201, 34, 0.3);
          border-radius: 2px;
          font-size: 0.8rem;
          color: var(--gold);
          letter-spacing: 0.05em;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.9rem 2rem;
          background: var(--gold);
          color: var(--green-deep);
          font-family: "Source Sans 3", sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-decoration: none;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(250, 201, 34, 0.25);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.9rem 2rem;
          background: transparent;
          color: var(--white);
          font-family: "Source Sans 3", sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          border: 1.5px solid rgba(255, 255, 254, 0.2);
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          border-color: var(--white);
          background: rgba(255, 255, 254, 0.05);
        }

        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .section-container {
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .section-label {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1rem;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s ease;
        }

        .section-label.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .section-heading {
          font-family: "Playfair Display", serif;
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          font-weight: 600;
          line-height: 1.2;
          margin-bottom: 1rem;
          max-width: 650px;
          opacity: 0;
          transform: translateY(25px);
          transition: all 0.8s ease 0.1s;
        }

        .section-heading.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .section-desc {
          font-size: 1.05rem;
          font-weight: 300;
          line-height: 1.7;
          color: var(--text-muted);
          max-width: 550px;
          margin-bottom: 4rem;
          opacity: 0;
          transform: translateY(25px);
          transition: all 0.8s ease 0.2s;
        }

        .section-desc.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .problem {
          padding: 8rem 3rem;
          background: var(--green);
          position: relative;
        }

        .problem::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(to bottom, var(--green-deep), var(--green));
          pointer-events: none;
        }

        .problem-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .problem-card {
          padding: 2.5rem 2rem;
          background: rgba(9, 46, 40, 0.6);
          border: 1px solid rgba(250, 201, 34, 0.08);
          border-radius: 3px;
          transition: all 0.5s ease;
          opacity: 0;
          transform: translateY(30px);
        }

        .problem-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .problem-card:hover {
          border-color: rgba(250, 201, 34, 0.2);
          transform: translateY(-4px);
          background: rgba(9, 46, 40, 0.8);
        }

        .problem-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gold-dim);
          border-radius: 2px;
          margin-bottom: 1.5rem;
        }

        .problem-icon svg {
          width: 22px;
          height: 22px;
          stroke: var(--gold);
          fill: none;
          stroke-width: 1.8;
        }

        .problem-card h3 {
          font-family: "Playfair Display", serif;
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .problem-card p {
          font-size: 0.92rem;
          font-weight: 300;
          line-height: 1.65;
          color: var(--text-muted);
        }

        .features {
          padding: 8rem 3rem;
          background: var(--green-deep);
          position: relative;
        }

        .features::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 200px;
          background: linear-gradient(to bottom, var(--green), var(--green-deep));
          pointer-events: none;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          margin-top: 1rem;
        }

        .feature-card {
          padding: 2.5rem;
          background: linear-gradient(
            135deg,
            rgba(13, 67, 59, 0.5),
            rgba(9, 46, 40, 0.3)
          );
          border: 1px solid rgba(250, 201, 34, 0.06);
          border-radius: 3px;
          position: relative;
          overflow: hidden;
          transition: all 0.5s ease;
          opacity: 0;
          transform: translateY(30px);
        }

        .feature-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .feature-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 3px;
          height: 0;
          background: var(--gold);
          transition: height 0.5s ease;
        }

        .feature-card:hover::before {
          height: 100%;
        }

        .feature-card:hover {
          border-color: rgba(250, 201, 34, 0.15);
          transform: translateY(-3px);
        }

        .feature-number {
          font-family: "Playfair Display", serif;
          font-size: 3rem;
          font-weight: 700;
          color: rgba(250, 201, 34, 0.1);
          line-height: 1;
          margin-bottom: 1rem;
        }

        .feature-card h3 {
          font-family: "Playfair Display", serif;
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .feature-card p {
          font-size: 0.92rem;
          font-weight: 300;
          line-height: 1.7;
          color: var(--text-muted);
        }

        .feature-tag {
          display: inline-block;
          margin-top: 1.2rem;
          padding: 0.3rem 0.8rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
          background: var(--gold-dim);
          border-radius: 2px;
        }

        .cta-strip {
          background: linear-gradient(
            135deg,
            rgba(250, 201, 34, 0.12),
            rgba(13, 67, 59, 0.85)
          );
          padding: 3.5rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          border-top: 1px solid rgba(250, 201, 34, 0.12);
          border-bottom: 1px solid rgba(250, 201, 34, 0.12);
        }

        .cta-strip h3 {
          font-family: "Playfair Display", serif;
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 600;
          color: var(--white);
        }

        .divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--gold-glow),
            transparent
          );
        }

        .landing-footer {
          padding: 4rem 3rem 2.5rem;
          background: var(--green-deep);
          border-top: 1px solid rgba(250, 201, 34, 0.08);
        }

        .footer-content {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 3rem;
        }

        .footer-brand {
          flex: 1;
        }

        .footer-logo {
          height: auto;
          width: min(100%, 360px);
          max-height: 84px;
          object-fit: contain;
          display: block;
          margin-bottom: 1rem;
        }

        .footer-tagline {
          font-size: 0.88rem;
          font-weight: 300;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 320px;
        }

        .footer-programs {
          display: flex;
          gap: 3rem;
        }

        .footer-col h4 {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1rem;
        }

        .footer-col ul {
          list-style: none;
        }

        .footer-col li {
          font-size: 0.88rem;
          font-weight: 300;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .footer-bottom {
          max-width: 1100px;
          margin: 3rem auto 0;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 254, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-bottom p {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 300;
        }

        .footer-badges {
          display: flex;
          gap: 0.75rem;
        }

        .footer-badge {
          padding: 0.3rem 0.7rem;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 254, 0.1);
          border-radius: 2px;
          color: var(--text-muted);
        }

        @media (max-width: 1180px) {
          .nav-links {
            display: none;
          }
          .nav-toggle {
            display: inline-flex;
          }
          .nav-links.open {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            position: absolute;
            top: 68px;
            right: 1.5rem;
            background: rgba(9, 46, 40, 0.95);
            padding: 1rem 1.25rem;
            border: var(--soft-border);
            border-radius: 3px;
            box-shadow: var(--card-shadow);
          }
        }

        @media (max-width: 900px) {
          .landing-nav {
            padding: 1rem 1.5rem;
          }
          .hero {
            padding-top: 5rem;
          }
          .hero-inner {
            grid-template-columns: 1fr;
            padding: 0 1.5rem;
          }
          .hero-content {
            margin-left: 0;
          }
          .hero-visual {
            order: 2;
          }
          .hero-proof {
            grid-template-columns: 1fr;
          }
          .problem {
            padding: 5rem 1.5rem;
          }
          .problem-grid {
            grid-template-columns: 1fr;
          }
          .features {
            padding: 5rem 1.5rem;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .cta-strip {
            flex-direction: column;
            align-items: flex-start;
            padding: 3rem 1.5rem;
          }
          .landing-footer {
            padding: 3rem 1.5rem 2rem;
          }
          .footer-content {
            flex-direction: column;
          }
          .footer-programs {
            flex-direction: column;
            gap: 2rem;
          }
          .footer-bottom {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <div className="landing-page">
        {/* Navigation */}
        <nav className={`landing-nav ${isScrolled ? "scrolled" : ""}`}>
          <Image
            src="/Clarkson-logo-full.png"
            alt="Clarkson University logo"
            className="nav-logo"
            width={520}
            height={56}
            priority
          />
          <button
            className="nav-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation"
          >
            Menu
          </button>
          <ul className={`nav-links ${isMenuOpen ? "open" : ""}`}>
            <li>
              <a href="#problem">Overview</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#footer">Contact</a>
            </li>
            <li>
              <Link href="/dashboard" className="nav-cta">
                Enter Database
              </Link>
            </li>
          </ul>
        </nav>

        <main>
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-pins">
              <div className="pin"></div>
              <div className="pin"></div>
              <div className="pin"></div>
              <div className="pin"></div>
              <div className="pin"></div>
              <div className="pin"></div>
              <div className="pin"></div>
              <div className="pin"></div>
            </div>

            <div className="hero-inner">
              <div className="hero-content">
                <div className="hero-badge">Clinical Placement Database</div>
                <h1>
                  Clinical Placements
                  <br />
                  <span className="gold">Database</span>
                </h1>
                <p className="hero-subtitle">
                  A single, searchable, mappable source of truth for PT, OT, and
                  PA clinical education.
                </p>
                <div className="hero-actions">
                  <Link href="/dashboard" className="btn-primary">
                    Enter Database
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <a href="#features" className="btn-secondary">
                    See Features
                  </a>
                </div>
                <div className="hero-proof">
                  <span>States covered: 50</span>
                  <span>Sites tracked: 90,000+</span>
                  <span>Programs: PT · OT · PA</span>
                </div>
              </div>

              <div className="hero-visual">
                <div className="hero-visual-card">
                  <svg
                    width="200"
                    height="150"
                    viewBox="0 0 200 150"
                    fill="none"
                  >
                    <path
                      d="M20 80 Q40 60, 60 70 T100 60 T140 70 T180 50"
                      stroke="rgba(250, 201, 34, 0.3)"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle cx="40" cy="65" r="8" fill="#FAC922" opacity="0.8" />
                    <circle cx="80" cy="55" r="6" fill="#3498DB" opacity="0.8" />
                    <circle
                      cx="120"
                      cy="70"
                      r="10"
                      fill="#E74C3C"
                      opacity="0.8"
                    />
                    <circle
                      cx="160"
                      cy="45"
                      r="7"
                      fill="#27AE60"
                      opacity="0.8"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          {/* Problem Section */}
          <section className="problem" id="problem">
            <div className="section-container">
              <div className="section-label reveal">The Challenge</div>
              <h2 className="section-heading reveal">
                Clinical placement coordination shouldn&apos;t run on
                spreadsheets
              </h2>
              <p className="section-desc reveal">
                Managing hundreds of sites across three programs and dozens of
                states demands better tooling than scattered files and tribal
                knowledge.
              </p>

              <div className="problem-grid">
                <div className="problem-card reveal">
                  <div className="problem-icon">
                    <svg
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <h3>Fragmented data</h3>
                  <p>
                    Site details live across spreadsheets, email threads, and
                    personal notes — no single, trusted source of truth.
                  </p>
                </div>

                <div className="problem-card reveal">
                  <div className="problem-icon">
                    <svg
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <h3>No spatial visibility</h3>
                  <p>
                    Lists with no map context make it hard to spot coverage
                    gaps, clustering issues, or proximity to universities.
                  </p>
                </div>

                <div className="problem-card reveal">
                  <div className="problem-icon">
                    <svg
                      viewBox="0 0 24 24"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <h3>Cross-program silos</h3>
                  <p>
                    PT, OT, and PA teams track placements separately, missing
                    chances to share sites, preceptors, and regional
                    intelligence.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="features" id="features">
            <div className="section-container">
              <div className="section-label reveal">Capabilities</div>
              <h2 className="section-heading reveal">
                One platform, complete{" "}
                <span style={{ color: "var(--gold)" }}>visibility</span>
              </h2>
              <p className="section-desc reveal">
                From interactive maps to AI-powered queries, everything clinical
                coordinators need to place students efficiently and
                strategically.
              </p>

              <div className="features-grid">
                <div className="feature-card reveal">
                  <div className="feature-number">01</div>
                  <h3>Interactive Map Intelligence</h3>
                  <p>
                    Every clinical site geocoded and plotted on a detailed,
                    zoomable map. See town names, site clusters, university
                    competitors, and coverage gaps at a glance.
                  </p>
                  <span className="feature-tag">Leaflet + OpenStreetMap</span>
                </div>

                <div className="feature-card reveal">
                  <div className="feature-number">02</div>
                  <h3>Searchable Site Database</h3>
                  <p>
                    Filter by state, profession, and clinic category across
                    74,000+ HRSA facilities. Records include location, site
                    type, bed counts, staffing FTEs, and rural status.
                  </p>
                  <span className="feature-tag">PostgreSQL Database</span>
                </div>

                <div className="feature-card reveal">
                  <div className="feature-number">03</div>
                  <h3>AI-Powered Queries</h3>
                  <p>
                    Ask questions in plain English — &quot;Which states have no
                    OT program?&quot; The AI translates your question into a
                    database query and returns actionable answers.
                  </p>
                  <span className="feature-tag">Claude AI</span>
                </div>

                <div className="feature-card reveal">
                  <div className="feature-number">04</div>
                  <h3>Multi-Layer Visualization</h3>
                  <p>
                    Toggle between HRSA sites, PT/OT/PA schools, military bases,
                    and Native American reserves. See how different site types
                    overlap and complement each other.
                  </p>
                  <span className="feature-tag">Layer Controls</span>
                </div>
              </div>
            </div>
          </section>

          <div className="divider"></div>

          {/* CTA Strip */}
          <section className="cta-strip">
            <h3>Ready to explore the database?</h3>
            <div>
              <Link href="/dashboard" className="btn-primary">
                Enter Database
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="landing-footer" id="footer">
          <div className="footer-content">
            <div className="footer-brand">
              <Image
                src="/Clarkson-logo-full.png"
                alt="Clarkson University logo"
                className="footer-logo"
                width={360}
                height={84}
              />
              <p className="footer-tagline">
                Clinical Placements Database — a centralized intelligence
                platform for Clarkson University&apos;s clinical education
                programs.
              </p>
            </div>
            <div className="footer-programs">
              <div className="footer-col">
                <h4>Programs</h4>
                <ul>
                  <li>Physical Therapy (PT)</li>
                  <li>Occupational Therapy (OT)</li>
                  <li>Physician Assistant (PA)</li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Platform</h4>
                <ul>
                  <li>Site Map</li>
                  <li>Database Search</li>
                  <li>AI Assistant</li>
                  <li>Analytics</li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Contact</h4>
                <ul>
                  <li>Clarkson University</li>
                  <li>Potsdam, NY 13699</li>
                  <li>Clinical Education Office</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              &copy; 2026 Clarkson University. Clinical Placements Database.
              Internal use only.
            </p>
            <div className="footer-badges">
              <span className="footer-badge">Internal Use</span>
              <span className="footer-badge">v1.0</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
