import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Brain, Users, BarChart3, FileText, MessageSquare, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary mr-2" />
              <span className="text-xl font-bold text-foreground">SmartHire</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              <Button asChild data-testid="nav-login-button">
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4 bg-gradient-to-br from-blue-50/50 via-background to-background dark:from-blue-950/20 dark:via-background dark:to-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Revolutionize Your{" "}
                <span className="text-blue-600 dark:text-blue-400">Hiring</span> with AI.
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Streamline your recruitment process with intelligent resume matching, automated AI interviews, and insightful performance reports. Transform how you discover and hire top talent.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" asChild data-testid="get-started-button">
                  <a href="/api/login">Get Started</a>
                </Button>
                <Button variant="outline" size="lg" asChild data-testid="free-trial-button">
                  <a href="/api/login">Try for Free</a>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="relative bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <Brain className="w-24 h-24 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <div className="grid grid-cols-3 gap-4 max-w-sm">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <FileText className="w-6 h-6 text-blue-500 mx-auto" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <Users className="w-6 h-6 text-green-500 mx-auto" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                      <BarChart3 className="w-6 h-6 text-purple-500 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Intelligent Hiring Features
            </h2>
            <p className="text-xl text-muted-foreground">
              Powered by advanced AI to make your recruitment process more efficient
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {/* Feature 1 - AI Based Resume Matching */}
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background rounded-2xl p-8 hover:shadow-lg transition-all">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">AI POWERED</Badge>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">AI Based Resume matching</h3>
              <p className="text-muted-foreground mb-6">
                Advanced algorithms analyze resumes and match candidates with job requirements, providing detailed compatibility scores and skill assessments for better hiring decisions.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
                <a href="/api/login">Learn More</a>
              </Button>
              <div className="mt-6 relative">
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-2 max-w-[200px]">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                      <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded mb-1"></div>
                      <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                      <div className="h-2 bg-green-200 dark:bg-green-800 rounded mb-1"></div>
                      <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - AI Interviews */}
            <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background rounded-2xl p-8 hover:shadow-lg transition-all">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
                  <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">ADVANCED</Badge>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">AI Interviews based on Resumes</h3>
              <p className="text-muted-foreground mb-6">
                Generate tailored interview questions automatically based on candidate resumes and job requirements. Conduct intelligent interviews that adapt to each candidate's background and experience.
              </p>
              <Button className="bg-green-600 hover:bg-green-700 text-white" asChild>
                <a href="/api/login">Learn More</a>
              </Button>
              <div className="mt-6 relative">
                <div className="aspect-video bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/10 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <div className="flex space-x-1 justify-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 - Performance Reports */}
            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background rounded-2xl p-8 hover:shadow-lg transition-all">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-4">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">INSIGHTFUL</Badge>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Performance Reports: Resume Reports Vs Interview Report</h3>
              <p className="text-muted-foreground mb-6">
                Get comprehensive insights comparing resume qualifications with interview performance. Make data-driven hiring decisions with detailed analytics and candidate assessments.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" asChild>
                <a href="/api/login">Learn More</a>
              </Button>
              <div className="mt-6 relative">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-16 h-16 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 rounded-2xl p-12 text-center text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Are you ready to take control?</h3>
            <p className="text-xl mb-8 text-blue-100">
              Transform your recruitment process with AI-powered tools that deliver results.
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <a href="/api/login">Get Started Now</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gray-50 dark:bg-gray-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Right Plan For Your Company
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the perfect plan to scale your hiring process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Basic Plan */}
            <Card className="hover:shadow-lg transition-shadow bg-background">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Basic</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-4">Free</div>
                <CardDescription>Perfect for small teams</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 10 candidates per month</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Basic resume matching</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Standard reports</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Email support</span>
                </div>
                <Button className="w-full mt-6" asChild>
                  <a href="/api/login">Get Started</a>
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="hover:shadow-lg transition-shadow bg-background border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-4">$49</div>
                <CardDescription>For growing companies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Up to 100 candidates per month</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced AI matching</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>AI interview questions</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Detailed analytics</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Priority support</span>
                </div>
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700" asChild>
                  <a href="/api/login">Start Free Trial</a>
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="hover:shadow-lg transition-shadow bg-background">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="text-4xl font-bold text-foreground mt-4">Custom</div>
                <CardDescription>For large organizations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited candidates</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Custom integrations</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Dedicated account manager</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>24/7 phone support</span>
                </div>
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Advanced security</span>
                </div>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <a href="/api/login">Contact Sales</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-4 bg-blue-600 dark:bg-blue-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Subscribe to our newsletter
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get the latest insights on AI recruitment and hiring best practices
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-4 py-3 rounded-lg text-foreground"
            />
            <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-background border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Brain className="h-8 w-8 text-primary mr-2" />
                <span className="text-xl font-bold text-foreground">SmartHire</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Revolutionizing recruitment with AI-powered solutions for modern businesses.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <span className="sr-only">Twitter</span>
                  <div className="w-6 h-6 bg-current rounded"></div>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <span className="sr-only">LinkedIn</span>
                  <div className="w-6 h-6 bg-current rounded"></div>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="/api/login" className="text-muted-foreground hover:text-foreground">Dashboard</a></li>
                <li><a href="/api/login" className="text-muted-foreground hover:text-foreground">Analytics</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Press</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">API</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground">
              © 2025 SmartHire. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}