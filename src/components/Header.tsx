"use client";

import Image from "next/image";
import { Database, ExternalLink } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 bg-green-deep/95 backdrop-blur-md border-b border-gold/10 flex items-center justify-between px-6 flex-shrink-0">
      {/* Logo and title */}
      <div className="flex items-center gap-4">
        <Image
          src="/Clarkson-logo-full.png"
          alt="Clarkson University"
          width={180}
          height={40}
          className="h-10 w-auto"
          priority
        />
        <div className="hidden sm:block h-8 w-px bg-gold/20" />
        <div className="hidden sm:flex items-center gap-2">
          <Database className="w-5 h-5 text-gold" />
          <span className="text-white font-heading text-lg">
            Clinical Placements
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-4">
        <span className="text-xs text-text-muted hidden md:block">
          PT · OT · PA Programs
        </span>
        <a
          href="#"
          className="text-sm text-text-light hover:text-gold transition-colors flex items-center gap-1"
        >
          Help
          <ExternalLink className="w-3 h-3" />
        </a>
      </nav>
    </header>
  );
}
