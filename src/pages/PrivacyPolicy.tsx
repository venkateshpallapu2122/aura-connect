import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            Privacy & Security Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            We are committed to protecting your privacy and ensuring the security of your communications.
          </p>
        </div>

        <section className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Lock className="w-6 h-6 text-green-500" />
            <h2>End-to-End Encryption</h2>
          </div>
          <p className="text-muted-foreground">
            Our messaging platform utilizes state-of-the-art End-to-End Encryption (E2EE). This means that your messages are encrypted on your device and can only be decrypted by the intended recipient. We, as the service provider, cannot read your messages. Keys are generated securely on your device and never leave it unencrypted.
          </p>
        </section>

        <section className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Eye className="w-6 h-6 text-blue-500" />
            <h2>Data Collection & Minimization</h2>
          </div>
          <p className="text-muted-foreground">
            We practice strict data minimization. We only collect the metadata necessary to route your messages (such as sender and recipient timestamps). We do not store message content in plaintext logs, nor do we sell your data to third parties.
          </p>
        </section>

        <section className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="w-6 h-6 text-orange-500" />
            <h2>User Rights</h2>
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>**Right to Access:** You can request a copy of your data at any time.</li>
            <li>**Right to Erasure:** You can permanently delete your account and all associated data using the "Delete Account" feature in Settings.</li>
            <li>**Right to Rectification:** You can update your profile information instantly.</li>
          </ul>
        </section>

        <footer className="pt-8 text-center text-sm text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>Contact our Data Protection Officer at privacy@example.com for inquiries.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
