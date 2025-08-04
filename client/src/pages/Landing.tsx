import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Brain, Users, BarChart3, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-primary/10 to-background py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Revolutionize Your{" "}
                <span className="text-primary">Hiring</span> with AI
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Streamline your recruitment process with intelligent resume matching, automated AI interviews, and insightful performance reports. Transform how you discover and hire top talent.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild data-testid="get-started-button">
                  <a href="/api/login">Let's get started</a>
                </Button>
                <Button variant="outline" size="lg" asChild data-testid="free-trial-button">
                  <a href="/api/login">Start with free trial</a>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
                <Brain className="w-24 h-24 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Intelligent Hiring Features
            </h2>
            <p className="text-xl text-muted-foreground">
              Powered by advanced AI to make your recruitment process more efficient
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI Based Resume Matching</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Advanced algorithms analyze resumes and match candidates with job requirements, providing detailed compatibility scores and skill assessments.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI Interviews Based on Resumes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automated interviews tailored to each candidate's background, ensuring relevant questions and comprehensive evaluation of skills and experience.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Performance Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Comprehensive reports comparing resume predictions with interview performance, helping you optimize your hiring decisions.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="bg-primary py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Are you ready to take control?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join hundreds of companies already using Smart Hiring to revolutionize their recruitment process
          </p>
          <Button size="lg" variant="secondary" asChild data-testid="cta-button">
            <a href="/api/login">Get Started Today</a>
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Right Plan For Your Company
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your hiring needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Basic</CardTitle>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Up to 50 candidates/month</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Basic resume matching</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Standard reports</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Email support</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" data-testid="choose-basic">
                  Choose Basic
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="relative border-primary shadow-lg scale-105">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Professional</CardTitle>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Up to 200 candidates/month</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Advanced AI matching</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">AI-powered interviews</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Detailed analytics</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>
                <Button className="w-full" data-testid="choose-professional">
                  Choose Professional
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Unlimited candidates</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Custom AI models</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Advanced integrations</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Dedicated support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="text-green-500 mr-3 h-4 w-4" />
                    <span className="text-sm">Custom reporting</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" data-testid="choose-enterprise">
                  Choose Enterprise
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary/90 text-primary-foreground py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary-foreground rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xl font-bold">Smart Hiring</span>
              </div>
              <p className="text-primary-foreground/80 leading-relaxed">
                Revolutionizing recruitment through AI-powered solutions for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Features</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">API</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  Twitter
                </a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  LinkedIn
                </a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                  GitHub
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
            <p className="text-primary-foreground/80">&copy; 2024 Smart Hiring. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
