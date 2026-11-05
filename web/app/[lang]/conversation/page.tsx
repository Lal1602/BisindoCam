import type { Metadata } from "next";
import { Conversation } from "@/components/conversation/conversation";
import { getDictionary } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { conversation } = await getDictionary();
  return { title: conversation.metaTitle, description: conversation.intro };
}

export default async function ConversationPage() {
  const { conversation, stage } = await getDictionary();

  return (
    <div className="page-gutter py-10 lg:py-14">
      <header className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-12 lg:gap-x-10">
        <p className="label lg:col-span-12">{conversation.eyebrow}</p>
        <h1 className="font-display text-(length:--text-title) lg:col-span-6">{conversation.title}</h1>
        <p className="max-w-[46ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-5 lg:col-start-8 lg:self-end">
          {conversation.intro}
        </p>
      </header>
      <Conversation labels={conversation} stage={stage} />
    </div>
  );
}
