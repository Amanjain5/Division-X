import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing-page">
      {/* ═══════ STICKY NAVIGATION ═══════ */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <span style={{ fontSize: '1.4rem' }}>⏰</span> TheTime
        </div>
        <div className="landing-nav-links">
          <Link href="#features" className="landing-nav-link">Features</Link>
          <Link href="#how-it-works" className="landing-nav-link">How it Works</Link>
          <Link href="#pricing" className="landing-nav-link">Pricing</Link>
        </div>
        <div className="landing-actions">
          <Link href="/auth/login" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>Log In</Link>
          <Link href="/auth/signup" className="btn btn-primary" style={{ background: 'white', color: 'var(--primary-dark)' }}>Start Free →</Link>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="hero-section">
        {/* Ambient glow blobs */}
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />

        <div className="hero-badge">🚀 Trusted by 2,000+ teams worldwide</div>
        <h1 className="hero-title">Track Time.<br/>Ship Faster.</h1>
        <p className="hero-subtitle">
          The modern time & activity tracker that your team will actually love using.
          One-click timers, smart timesheets, and powerful analytics — all in one place.
        </p>
        <div className="hero-cta-row">
          <Link href="/auth/signup" className="btn hero-btn-primary">Get Started Free</Link>
          <Link href="#how-it-works" className="btn hero-btn-secondary">See How It Works ↓</Link>
        </div>

        {/* ── Dashboard Mockup ── */}
        <div className="hero-dashboard">
          <div className="hero-dash-inner">
            {/* Mini sidebar */}
            <div className="dash-sidebar-mock">
              <div className="dash-logo-mock">⏰ TheTime</div>
              <div className="dash-nav-mock"><span className="dash-dot" style={{ background: 'var(--primary)' }} /> Tracker</div>
              <div className="dash-nav-mock"><span className="dash-dot" /> Timesheet</div>
              <div className="dash-nav-mock"><span className="dash-dot" /> Dashboard</div>
              <div className="dash-nav-mock"><span className="dash-dot" /> Reports</div>
              <div className="dash-nav-mock"><span className="dash-dot" /> Projects</div>
              <div className="dash-nav-mock"><span className="dash-dot" /> Teams</div>
            </div>
            {/* Main content mock */}
            <div className="dash-main-mock">
              <div className="dash-timer-mock">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem' }}>● Recording</span>
                  <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Landing page redesign</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 800 }}>01:24:08</div>
              </div>
              {/* Stats row */}
              <div className="dash-stats-mock">
                <div className="dash-stat-mock"><div className="dash-stat-label">This Week</div><div className="dash-stat-value">38.5h</div></div>
                <div className="dash-stat-mock"><div className="dash-stat-label">Billable</div><div className="dash-stat-value">24.2h</div></div>
                <div className="dash-stat-mock"><div className="dash-stat-label">Active</div><div className="dash-stat-value">3</div></div>
                <div className="dash-stat-mock"><div className="dash-stat-label">Projects</div><div className="dash-stat-value">12</div></div>
              </div>
              {/* Chart bars mock */}
              <div className="dash-chart-mock">
                {[65, 80, 55, 90, 70, 30, 10].map((h, i) => (
                  <div key={i} className="dash-bar-col">
                    <div className="dash-bar" style={{ height: `${h}%` }} />
                    <span className="dash-bar-label">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ LOGOS BAR ═══════ */}
      <section className="logos-section">
        <p className="logos-label">Loved by teams at</p>
        <div className="logos-row">
          {['Vercel', 'Stripe', 'Notion', 'Linear', 'Figma', 'Slack'].map((name) => (
            <div key={name} className="logo-item">{name}</div>
          ))}
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="features-section">
        <div className="features-header">
          <div className="section-badge">Features</div>
          <h2 className="features-title">Everything you need to master time</h2>
          <p className="features-subtitle">From one-click tracking to deep analytics, TheTime gives your team superpowers.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card feature-card-highlight">
            <div className="feature-icon">⏱️</div>
            <h3>One-Click Timer</h3>
            <p>Start tracking instantly with a single click. Add projects, tags, and billable status on the fly. Resume past entries with one tap.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Smart Timesheets</h3>
            <p>Automatically generated weekly timesheets with day-by-day breakdowns, project grouping, and inline approval flows.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🍅</div>
            <h3>Pomodoro Mode</h3>
            <p>Built-in focus/break cycles with configurable durations. Auto-transitions between work and rest for peak productivity.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Rich Analytics</h3>
            <p>Visual project breakdown charts, billable vs. non-billable splits, and team utilization metrics at a glance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Team Management</h3>
            <p>Role-based access (Owner, Admin, Manager, Member). Invite via email, manage roles, monitor active timers in real-time.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Workspace Policies</h3>
            <p>Enforce rules: idle detection, overtime alerts, force-timer mode, and long-running timer notifications. Full compliance.</p>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="how-section">
        <div className="features-header">
          <div className="section-badge">How It Works</div>
          <h2 className="features-title">Up and running in 60 seconds</h2>
          <p className="features-subtitle">No credit card required. No complex setup. Just time tracking that works.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create Your Workspace</h3>
            <p>Sign up with your email. Name your workspace. You&apos;re the owner — invite your team whenever you&apos;re ready.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Track Your Time</h3>
            <p>Hit start. Describe what you&apos;re doing. Assign a project. That&apos;s it. Timer runs live with second-by-second precision.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Get Insights</h3>
            <p>See where your time goes. Approve timesheets. Export reports. Make data-driven decisions about your team&apos;s capacity.</p>
          </div>
        </div>
      </section>

      {/* ═══════ STATS BAR ═══════ */}
      <section className="stats-bar-section">
        <div className="stats-bar">
          <div className="stat-block">
            <div className="stat-block-value">2M+</div>
            <div className="stat-block-label">Hours Tracked</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-block">
            <div className="stat-block-value">50K+</div>
            <div className="stat-block-label">Users</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-block">
            <div className="stat-block-value">99.9%</div>
            <div className="stat-block-label">Uptime</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-block">
            <div className="stat-block-value">4.9★</div>
            <div className="stat-block-label">User Rating</div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="testimonials-section">
        <div className="features-header">
          <div className="section-badge">Testimonials</div>
          <h2 className="features-title">Teams love TheTime</h2>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p>&ldquo;We switched from Toggl and haven&apos;t looked back. The Pomodoro mode and idle detection are game changers for our remote team.&rdquo;</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ background: '#6366F1' }}>S</div>
              <div><strong>Sarah Chen</strong><br/><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>CTO, Buildspace</span></div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p>&ldquo;Finally, a time tracker that my developers actually enjoy using. The approval workflow saves us 3 hours per week on admin.&rdquo;</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ background: 'var(--primary)' }}>M</div>
              <div><strong>Marcus Rivera</strong><br/><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>VP Eng, DataHaus</span></div>
            </div>
          </div>
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p>&ldquo;The workspace policies feature ensures compliance across our 200+ person org. Overtime alerts and audit logs are essential.&rdquo;</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ background: '#F59E0B' }}>A</div>
              <div><strong>Aisha Patel</strong><br/><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>HR Director, ScaleOps</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="pricing-section">
        <div className="features-header">
          <div className="section-badge">Pricing</div>
          <h2 className="features-title">Simple, transparent pricing</h2>
          <p className="features-subtitle">Start free, upgrade when you&apos;re ready. No hidden fees.</p>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-name">Free</div>
            <div className="pricing-price">$0<span>/mo</span></div>
            <div className="pricing-desc">For individuals and small teams getting started</div>
            <ul className="pricing-features">
              <li>Up to 5 team members</li>
              <li>Unlimited time tracking</li>
              <li>Basic timesheets</li>
              <li>1 workspace</li>
            </ul>
            <Link href="/auth/signup" className="btn btn-secondary" style={{ width: '100%' }}>Get Started</Link>
          </div>
          <div className="pricing-card pricing-card-popular">
            <div className="pricing-popular-badge">Most Popular</div>
            <div className="pricing-name">Pro</div>
            <div className="pricing-price">$8<span>/user/mo</span></div>
            <div className="pricing-desc">For growing teams that need advanced features</div>
            <ul className="pricing-features">
              <li>Unlimited members</li>
              <li>Pomodoro & break mode</li>
              <li>Approval workflows</li>
              <li>Workspace policies</li>
              <li>CSV export & reports</li>
              <li>Priority support</li>
            </ul>
            <Link href="/auth/signup" className="btn btn-primary" style={{ width: '100%' }}>Start Free Trial</Link>
          </div>
          <div className="pricing-card">
            <div className="pricing-name">Enterprise</div>
            <div className="pricing-price">Custom</div>
            <div className="pricing-desc">For large organizations with compliance needs</div>
            <ul className="pricing-features">
              <li>Everything in Pro</li>
              <li>Audit log & compliance</li>
              <li>SSO / SAML (coming soon)</li>
              <li>Dedicated support</li>
              <li>Custom integrations</li>
            </ul>
            <Link href="/auth/signup" className="btn btn-secondary" style={{ width: '100%' }}>Contact Sales</Link>
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="final-cta-section">
        <h2>Ready to take control of your time?</h2>
        <p>Join thousands of teams already tracking smarter with TheTime.</p>
        <Link href="/auth/signup" className="btn hero-btn-primary" style={{ fontSize: '1.1rem', padding: '18px 40px' }}>Start Tracking Free →</Link>
        <div style={{ marginTop: 16, fontSize: '0.9rem', opacity: 0.7 }}>No credit card required · Free forever plan available</div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="landing-logo" style={{ color: 'white', marginBottom: 12 }}>⏰ TheTime</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>The modern time & activity tracker for teams that ship fast.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#how-it-works">How it Works</Link>
            <Link href="/auth/signup">Sign Up</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="#">About</Link>
            <Link href="#">Blog</Link>
            <Link href="#">Careers</Link>
            <Link href="#">Contact</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
            <Link href="#">Cookie Policy</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} TheTime. All rights reserved.</span>
          <span>Built with ❤️ by Division X</span>
        </div>
      </footer>
    </main>
  );
}
