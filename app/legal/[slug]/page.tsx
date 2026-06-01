import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { BETA_LEGAL_POLICIES, getLegalPolicy, LEGAL_POLICY_SLUGS } from "@/lib/legal/betaLegalPolicies";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LEGAL_POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const policy = getLegalPolicy(slug);
  if (!policy) return { title: "Governance" };
  return {
    title: policy.title,
    description: policy.summary,
  };
}

export default async function LegalPolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = getLegalPolicy(slug);
  if (!policy) notFound();

  return <LegalDocumentView policy={policy} />;
}
