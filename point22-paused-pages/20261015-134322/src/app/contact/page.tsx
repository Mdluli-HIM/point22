import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="editorial-page contact-page" aria-labelledby="contact-heading">
      <p className="page-eyebrow">CONTACT / COLLABORATE</p>
      <h1 id="contact-heading">Have something <em>in mind?</em></h1>
      <p className="contact-description">
        Photography, films, fashion, collaborative projects, or an idea that
        doesn’t fit into a category. Start a conversation.
      </p>
      {/* We will add the owner's real email and social links when provided. */}
    </section>
  );
}
