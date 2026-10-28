import Link from "next/link";

export default function Home() {
  return (
    <main className="game-shell">
      <div className="game-wrap">
        <header className="topbar">
          <Link className="brand" href="/" aria-label="Snack Swipe home">
            <span className="brand-mark" aria-hidden="true">🍟</span>
            <span>
              snack<span className="brand-accent">swipe</span>
            </span>
          </Link>
        </header>

        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-copy">
            <p className="eyebrow">
              <span className="eyebrow-dot" /> A LITTLE GAME WITH A BIG APPETITE
            </p>
            <h1 id="home-title">
              Meet your next <span>snack attack.</span>
            </h1>
            <p className="home-description">
              Catch the tasty stuff, let the bad bites pass, and see how high
              your score can go. Ready when you are.
            </p>
            <Link className="start-button home-play-button" href="/games/snack-attack">
              <span>Play Snack Attack</span>
              <span aria-hidden="true">→</span>
            </Link>
            <p className="home-controls">
              Free to play · Mouse, touch, or arrow keys · No downloads
            </p>
          </div>
          <div className="home-snacks" aria-hidden="true">
            <span className="home-snack home-snack-burger">🍔</span>
            <span className="home-snack home-snack-pizza">🍕</span>
            <span className="home-snack home-snack-donut">🍩</span>
            <span className="home-snack home-snack-fries">🍟</span>
          </div>
        </section>

        <section className="home-rules" aria-labelledby="home-rules-title">
          <div className="home-rules-heading">
            <span className="how-spark" aria-hidden="true">✳</span>
            <div>
              <h2 id="home-rules-title">Ready in three seconds</h2>
              <p>Three little rules. One very hungry basket.</p>
            </div>
          </div>
          <div className="home-rule-grid">
            <article className="home-rule">
              <span className="rule-icon food-icon" aria-hidden="true">🍕</span>
              <span><strong>Catch the good stuff</strong><small>Every snack earns at least 10 points.</small></span>
            </article>
            <article className="home-rule">
              <span className="rule-icon danger-icon" aria-hidden="true">💣</span>
              <span><strong>Skip the bad bites</strong><small>A bomb or rotten snack costs a life.</small></span>
            </article>
            <article className="home-rule">
              <span className="rule-icon power-icon" aria-hidden="true">🛡️</span>
              <span><strong>Build a tasty streak</strong><small>Quick catches build combos and bonus points.</small></span>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
