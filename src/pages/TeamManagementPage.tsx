export const TeamManagementPage = () => {
  return (
    <div className="dark bg-background text-on-background min-h-screen flex overflow-hidden">
      {/* Left Side: Interactive Portal */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen overflow-y-auto px-8 lg:px-16 py-12 bg-background relative z-10">
        {/* TopNavBar Component Integration */}
        <header className="w-full top-0 left-0 bg-transparent mb-12">
          <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
            <div className="text-2xl font-bold tracking-tighter text-[#41dfa5] font-manrope flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl" data-icon="shield" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
              HumanFirst
            </div>
            <div className="hidden md:flex items-center space-x-8 ml-auto">
              <nav className="flex items-center space-x-6 font-manrope text-sm font-medium tracking-wide">
                <a className="text-[#bfc7d1] hover:text-[#41dfa5] transition-colors duration-300" href="#">
                  Technology
                </a>
                <a className="text-[#bfc7d1] hover:text-[#41dfa5] transition-colors duration-300" href="#">
                  Privacy
                </a>
                <a className="text-[#bfc7d1] hover:text-[#41dfa5] transition-colors duration-300" href="#">
                  Support
                </a>
              </nav>
              <div className="text-[#bfc7d1] hover:text-[#41dfa5] transition-colors duration-300 scale-95 active:opacity-80 transition-all cursor-pointer">
                <span className="material-symbols-outlined" data-icon="security">
                  security
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Narrative Content */}
        <div className="max-w-md w-full flex-grow space-y-8">
          <div className="space-y-4">
            <a className="inline-flex items-center gap-2 text-sm text-secondary hover:text-white transition-colors group" href="#">
              <span className="material-symbols-outlined text-lg" data-icon="arrow_back">
                arrow_back
              </span>
              Back to home
            </a>
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight font-manrope leading-tight text-on-surface">
              Welcome to HumanFirst
            </h1>
            <p className="text-lg text-secondary font-medium">Select your role to continue</p>
            {/* New introduction text */}
            <p className="text-sm text-on-secondary-container leading-relaxed font-body border-l-2 border-primary/30 pl-4 py-1 italic">
              A digital ecosystem built on absolute privacy and professional integrity. Select your access path to continue your journey.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            {/* Administrator Card */}
            <button className="w-full flex items-center gap-6 p-6 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high hover:border-primary/50 transition-all duration-300 text-left group">
              <div className="w-14 h-14 shrink-0 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5 text-primary">
                <span className="material-symbols-outlined text-2xl" data-icon="security">
                  security
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface font-manrope">Administrator</h3>
                <p className="text-sm text-secondary leading-relaxed">Manage policies, view analytics, and oversee enforcement</p>
              </div>
            </button>

            {/* Student Card */}
            <button className="w-full flex items-center gap-6 p-6 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high hover:border-tertiary/50 transition-all duration-300 text-left group">
              <div className="w-14 h-14 shrink-0 rounded-full border border-tertiary/20 flex items-center justify-center bg-tertiary/5 text-tertiary">
                <span className="material-symbols-outlined text-2xl" data-icon="school">
                  school
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface font-manrope">Student</h3>
                <p className="text-sm text-secondary leading-relaxed">View active policies and understand your privacy rights</p>
              </div>
            </button>
          </div>

          {/* Testimonial Section */}
          <div className="pt-4 flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-background overflow-hidden">
                <img
                  alt="User"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3pnXB4_wuuAHhgW9CSdmMjfPX5lS4ir2Ls9AAzl2CPaKgIxxnQNPmk3KiA9glqsQzvKA3bOoNVltq-Xo100MlHqMSEYjP4XQmG_4wFrkOcnvCM-qIMTaUzmXB1UJB5CQHFlYqxDN23v8hShh8EJHjBLCruY8Po6ekA66p44qIt0FE9n2jkEtGu3rJxbjVtzpmdyx6irdllVinoWWWCl7sI_p1B9NCJ65XpjS6vVxEg_texe6ka8hncix0bEsG50c-nnDN4tarN2k"
                />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-background overflow-hidden">
                <img
                  alt="User"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuspDCtTmrAODEgALmwkU9hIKtcSapnXjrCsoqO3MS5ergbwS5_qjCelSVn89gjHm0cSHwMBMdY43h8WjGgT18sys67gpEQGfAUpfM3N9fhcb15cmjpwh1KPuAFkPlZbyrC6jalBPYUlMBO8iXIiAiue729Auq0TupNDFIdBaQD7i8ds7JdncDUVYMTkEot60uGYHQq40KyBudsC49n7gaZy2a0ARq1PlBxOcEGZnHhjlWurD5f7BSDT9Wm6EDR1yHZWAGzddcAoY"
                />
              </div>
            </div>
            <p className="text-sm text-secondary font-medium italic">Join 12,000+ secure users</p>
          </div>
        </div>

        {/* Left Footer */}
        <div className="mt-12 pt-8 border-t border-outline-variant/10 flex flex-col gap-4">
          <a className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined text-lg" data-icon="favorite">
              favorite
            </span>
            Read our Trust &amp; Ethics commitment
          </a>
          <div className="flex gap-6 text-xs text-secondary/60">
            <span>© 2024 HumanFirst</span>
            <a className="hover:text-white" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-white" href="#">
              Terms of Service
            </a>
          </div>
        </div>
      </div>

      {/* Right Side: Brand Statement (Gradient Side) */}
      <div className="hidden lg:flex lg:w-1/2 h-screen brand-gradient relative items-center justify-center p-12 overflow-hidden">
        {/* Visual Overlay for Legibility */}
        <div className="absolute inset-0 legibility-overlay pointer-events-none"></div>
        {/* Subtle Grid/Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#41dfa5 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        ></div>
        <div className="relative z-10 max-w-lg text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 mx-auto">
            <span
              className="material-symbols-outlined text-4xl text-primary"
              data-icon="verified_user"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-extrabold font-manrope tracking-tight text-white text-shadow-sm">
              Privacy by Design
            </h2>
            <p className="text-xl leading-relaxed text-white font-medium">
              HumanFirst is built on the principle that education thrives on trust, not surveillance. We help create focused learning environments while respecting student privacy.
            </p>
          </div>
          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-6">
            <span className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-primary text-xs font-bold tracking-wider uppercase">
              No Screen Recording
            </span>
            <span className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-primary text-xs font-bold tracking-wider uppercase">
              No Keystroke Logging
            </span>
            <span className="px-4 py-2 rounded-full bg-black/40 border border-white/10 text-primary text-xs font-bold tracking-wider uppercase">
              No Content Reading
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagementPage;
