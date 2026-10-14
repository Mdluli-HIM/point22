import type { Metadata } from "next";

export const metadata: Metadata = { title: "Information" };

const disciplines = [
  "Photography",
  "Fashion",
  "Clothing",
  "Film & Video",
  "Everyday Life",
];

export default function InformationPage() {
  return (
    <section className="editorial-page" aria-labelledby="information-heading">
      <p className="page-eyebrow">ABOUT POINT22</p>
      <h1 id="information-heading">Not one thing. <em>One point of view.</em></h1>
      <div className="editorial-grid">
        <span className="editorial-label">THE IDEA</span>
        <p>
          Point22 is a personal visual world: the things I notice, the things I
          create, and the stories I want to share. No single medium defines it.
        </p>
        <span className="editorial-label">WHAT LIVES HERE</span>
        <ul>{disciplines.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
  );
}
