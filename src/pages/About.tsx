/**
 * About Page
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">About THE LOST+UNFOUNDS</h1>
        <p className="text-xl text-white/70">
          Empowering creators and professionals with powerful digital tools
        </p>
      </div>

      <div className="space-y-12">
        {/* Mission */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-white/80 text-lg leading-relaxed">
            At THE LOST+UNFOUNDS, we believe that everyone should have access to powerful digital tools 
            that make their work easier and more efficient. We're building a platform that brings together 
            the best utilities and tools in one place, making them accessible to creators, professionals, 
            and anyone who needs them.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <Zap className="w-8 h-8 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Simplicity</h3>
              <p className="text-white/70">
                We make complex tools simple and easy to use, so you can focus on what matters.
              </p>
            </div>
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <Shield className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Privacy</h3>
              <p className="text-white/70">
                Your data is yours. We don't store unnecessary information and respect your privacy.
              </p>
            </div>
            <div className="bg-black border border-white/10 rounded-lg p-6">
              <Sparkles className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Innovation</h3>
              <p className="text-white/70">
                We're constantly adding new tools and features to help you stay ahead.
              </p>
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">What We Offer</h2>
          <div className="space-y-4 text-white/80">
            <p>
              <strong className="text-white">Free Tier:</strong> Get started with 5 downloads per day and access to all basic tools. 
              No credit card required.
            </p>
            <p>
              <strong className="text-white">Premium Tier:</strong> Unlimited access to all tools for just $9.99/month. 
              Perfect for regular users and creators.
            </p>
            <p>
              <strong className="text-white">Pro Tier:</strong> Everything in Premium plus API access for developers and power users. 
              $19.99/month.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/70 mb-6">
            Join thousands of users who are already using THE LOST+UNFOUNDS to streamline their workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/tools"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
            >
              Explore Tools <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black border border-white/10 text-white font-semibold rounded-lg hover:border-white/30 transition"
            >
              View Documentation
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}


