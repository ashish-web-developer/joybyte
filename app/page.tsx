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
            <a className="home-how-link" href="#how-to-play">
              How to play <span aria-hidden="true">↓</span>
            </a>
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

        <section
          id="how-to-play"
          className="home-rules"
          aria-labelledby="home-rules-title"
        >
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
              <span><strong>Build a tasty streak</strong><small>Quick catches build combos. Shields block one bad bite; clocks slow snacks for 5 seconds.</small></span>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#343c36] bg-[#171d1a] p-6 text-[#eee9dc] shadow-xl sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#d5ad6e]">
              A new city. A way out.
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Take the long way home.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#a3aaa0]">
              Read the streets, keep the car on the road, and find the studio
              before midnight in ESCAPE ROUTE.
            </p>
          </div>
          <Link
            className="mt-5 inline-flex shrink-0 items-center gap-3 rounded-xl bg-[#d5ad6e] px-5 py-3 text-sm font-bold text-[#1d211e] transition hover:-translate-y-0.5 hover:bg-[#e2bd82] sm:mt-0"
            href="/games/escape-route/level-01"
          >
            Drive Escape Route <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
              A new game to get lost in
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Light up the grid.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">
              Rotate the circuit, collect every signal, and find your way out
              in Loopbreak.
            </p>
          </div>
          <Link
            className="mt-5 inline-flex shrink-0 items-center gap-3 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-lime-200 sm:mt-0"
            href="/games/loopbreak"
          >
            Play Loopbreak <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="mt-4 rounded-2xl border border-[#efdfce] bg-white/80 p-6 shadow-[0_12px_30px_rgba(130,84,55,0.06)] sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#c67c50]">
              A classic, with a little extra charm
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#352a32] sm:text-3xl">
              Roll your way to 100.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#8d7e7e]">
              Race Clover, climb a few ladders, and try not to get caught by a snake.
            </p>
          </div>
          <Link
            className="mt-5 inline-flex shrink-0 items-center gap-3 rounded-xl bg-[#f27648] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#df6840] sm:mt-0"
            href="/games/snakes-and-ladders"
          >
            Play Snakes &amp; Ladders <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
