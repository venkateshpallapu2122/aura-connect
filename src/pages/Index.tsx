import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Lock, Zap, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/chat");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary mb-6">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Chat Reimagined
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Fast, secure, and feature-rich messaging for the modern era
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-primary text-white text-lg px-8" onClick={() => navigate("/auth")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Our Chat?</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">Real-time messaging with instant delivery and smooth animations</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-muted-foreground">Built with security in mind to keep your conversations safe</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect Easily</h3>
            <p className="text-muted-foreground">Find and chat with friends instantly with our intuitive interface</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl gradient-primary">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/90 text-lg mb-8">Join thousands of users already enjoying fast, secure messaging</p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8" onClick={() => navigate("/auth")}>
            Create Account
          </Button>
        </div>
      </div>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-muted-foreground">© 2024 Chat App. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇮🇳</span>
              <p className="text-sm font-semibold bg-gradient-to-r from-[#FF9933] via-white to-[#138808] bg-clip-text text-transparent">
                Proudly Made in India
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
