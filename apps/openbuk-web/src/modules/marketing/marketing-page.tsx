import { brand } from "../../shared/brand";
import { Logo } from "../../shared/ui";
import { useLanguage, LanguageSwitch } from "../../shared/i18n";
export default function MarketingPage() {
  const { t } = useLanguage();
  return (
    <>
      <header className="marketing-nav wrap">
        <Logo />
        <nav>
          <LanguageSwitch />
          <a href={`${brand.appUrl}/login`}>{t("login")}</a>
          <a className="button small" href={`${brand.appUrl}/signup`}>
            {t("start")} <span>↗</span>
          </a>
        </nav>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" />
              {t("built")}
            </p>
            <h1>{t("hero")}</h1>
            <p className="hero-sub">{t("tagline")}</p>
            <p className="muted lead">{t("intro")}</p>
            <div className="actions">
              <a className="button" href={`${brand.appUrl}/signup`}>
                {t("start")} <span>↗</span>
              </a>
              <a className="button secondary" href="#how">
                {t("demo")} <span>↓</span>
              </a>
            </div>
            <p className="micro">
              {t("noCommission")} · {t("ownCustomers")}
            </p>
          </div>
          <div className="hero-art">
            <div className="art-circle" />
            <div className="preview-card">
              <div className="preview-banner">
                <span className="petal">✳</span>
                <span>{t("sampleStudio")}</span>
                <small>{t("preview")}</small>
              </div>
              <div className="preview-content">
                <span className="eyebrow">01 / {t("service")}</span>
                <div className="sample-service">
                  <div>
                    <strong>{t("sampleService")}</strong>
                    <p className="muted">
                      45 {t("minutes")} · {t("sampleStaff")}
                    </p>
                  </div>
                  <strong>€35</strong>
                </div>
                <p className="eyebrow">02 / {t("sampleDay")}</p>
                <div className="sample-days" aria-hidden="true">
                  {[12, 13, 14, 15, 16].map((d) => (
                    <span key={d} className={d === 14 ? "selected" : ""}>
                      {d}
                    </span>
                  ))}
                </div>
                <div className="sample-times" aria-hidden="true">
                  <span>09:00</span>
                  <span className="selected">10:30</span>
                  <span>14:00</span>
                </div>
                <div className="preview-button">{t("confirm")} ↗</div>
              </div>
            </div>
            <p className="art-caption">{t("previewNote")}</p>
            <span className="sparkle" aria-hidden="true">
              ✳
            </span>
          </div>
        </section>
        <div className="promise-strip">
          <div className="wrap">
            {["noCommission", "ownCustomers", "openSource"].map((k) => (
              <span key={k}>✓ {t(k as "noCommission")}</span>
            ))}
          </div>
        </div>
        <section className="section wrap" id="how">
          <p className="eyebrow">{brand.name} / 01</p>
          <h2>{t("how")}</h2>
          <div className="feature-grid">
            {([1, 2, 3] as const).map((n) => (
              <article key={n}>
                <span className="step-number">0{n}</span>
                <h3>{t(`step${n}`)}</h3>
                <p className="muted">{t(`step${n}body`)}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="ownership wrap">
          <div>
            <p className="eyebrow">{t("promise")}</p>
            <h2>{t("philosophy")}</h2>
            <p>{t("philosophyBody")}</p>
          </div>
          <div className="ownership-symbol" aria-hidden="true">
            ↗
          </div>
        </section>
        <section className="section final-cta wrap">
          <h2>{t("ready")}</h2>
          <a className="button" href={`${brand.appUrl}/signup`}>
            {t("start")} ↗
          </a>
        </section>
      </main>
      <footer className="wrap">
        <Logo />
        <p>{t("footer")}</p>
        <LanguageSwitch />
      </footer>
    </>
  );
}
