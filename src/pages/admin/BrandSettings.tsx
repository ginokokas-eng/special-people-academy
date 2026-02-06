import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const colorTokens = [
  { name: "Primary (Deep Teal)", cssVar: "--primary", hex: "#124145", usage: "Headings, buttons, links, key UI elements" },
  { name: "Background (Soft Mint)", cssVar: "--background", hex: "#F5FAF8", usage: "Page backgrounds, subtle fills" },
  { name: "Surface (White)", cssVar: "--card", hex: "#FFFFFF", usage: "Cards, modals, elevated surfaces" },
  { name: "Accent Green", cssVar: "--accent-green", hex: "#C4D14F", usage: "Active states, success, focus rings, 'Blended' badge" },
  { name: "Accent Peach", cssVar: "--accent-peach", hex: "#FF988C", usage: "Warnings, important callouts, cart badge" },
  { name: "Accent Yellow", cssVar: "--accent-yellow", hex: "#F9D37A", usage: "Friendly emphasis, 'Practical' badge" },
  { name: "Neutral Grey", cssVar: "--neutral-grey", hex: "#A7A9AC", usage: "Borders, disabled states, secondary text" },
];

const typographyScale = [
  { level: "H1", font: "Baloo 2", size: "44–48px", weight: "Bold (700)", usage: "Page titles, hero headlines" },
  { level: "H2", font: "Baloo 2", size: "32–36px", weight: "Semibold (600)", usage: "Section headings" },
  { level: "H3", font: "Baloo 2", size: "24–28px", weight: "Semibold (600)", usage: "Card titles, subsections" },
  { level: "Body", font: "Poppins", size: "16–18px", weight: "Regular (400)", usage: "Paragraphs, descriptions" },
  { level: "Small", font: "Poppins", size: "12–14px", weight: "Regular (400)", usage: "Captions, meta text, labels" },
];

const BrandSettings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Brand Settings</h1>
          <p className="text-muted-foreground mt-1">
            Internal reference for Special People Academy design system
          </p>
        </div>

        {/* Colour Tokens */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Colour Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {colorTokens.map((token) => (
                <div key={token.name} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                  <div 
                    className="w-12 h-12 rounded-lg border border-border shadow-sm flex-shrink-0"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{token.name}</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{token.hex}</code>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{token.cssVar}</code>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{token.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Typography Scale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typographyScale.map((type) => (
                <div key={type.level} className="flex items-start gap-4 p-3 rounded-lg border border-border">
                  <div className="w-16 flex-shrink-0">
                    <span className="font-heading font-semibold text-primary">{type.level}</span>
                  </div>
                  <div className="flex-1 grid sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Font:</span>{" "}
                      <span className="text-foreground">{type.font}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>{" "}
                      <span className="text-foreground">{type.size}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight:</span>{" "}
                      <span className="text-foreground">{type.weight}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground hidden lg:block w-48">
                    {type.usage}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h4 className="font-heading font-semibold text-foreground">Live Examples</h4>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <h1 className="text-4xl font-heading font-bold text-foreground">Heading 1 (Baloo 2)</h1>
                <h2 className="text-3xl font-heading font-semibold text-foreground">Heading 2 (Baloo 2)</h2>
                <h3 className="text-2xl font-heading font-semibold text-foreground">Heading 3 (Baloo 2)</h3>
                <p className="text-base text-foreground">Body text using Poppins - clean and readable for longer content.</p>
                <p className="text-sm text-muted-foreground">Small text for captions and meta information.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Button Styles */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Button Styles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Button variant="default">Primary Button</Button>
                  <p className="text-xs text-muted-foreground">
                    Background: #124145<br />
                    Text: White<br />
                    Use: Main actions
                  </p>
                </div>
                <div className="space-y-2">
                  <Button variant="secondary">Secondary Button</Button>
                  <p className="text-xs text-muted-foreground">
                    Background: Beige<br />
                    Text: #124145<br />
                    Use: Alternative actions
                  </p>
                </div>
                <div className="space-y-2">
                  <Button variant="outline">Outline Button</Button>
                  <p className="text-xs text-muted-foreground">
                    Border: #124145<br />
                    Text: #124145<br />
                    Use: Secondary CTAs
                  </p>
                </div>
                <div className="space-y-2">
                  <Button variant="ghost">Ghost Button</Button>
                  <p className="text-xs text-muted-foreground">
                    Background: Transparent<br />
                    Text: #124145<br />
                    Use: Tertiary actions
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Button variant="accent">Accent Button</Button>
                  <p className="text-xs text-muted-foreground">
                    Background: #C4D14F<br />
                    Text: #124145<br />
                    Use: Highlight actions
                  </p>
                </div>
                <div className="space-y-2">
                  <Button variant="destructive">Destructive</Button>
                  <p className="text-xs text-muted-foreground">
                    Background: #FF988C<br />
                    Text: #124145<br />
                    Use: Delete/warning
                  </p>
                </div>
                <div className="space-y-2">
                  <Button disabled>Disabled</Button>
                  <p className="text-xs text-muted-foreground">
                    Background: Grey<br />
                    Use: Inactive state
                  </p>
                </div>
                <div className="space-y-2">
                  <Button size="lg">Large Button</Button>
                  <p className="text-xs text-muted-foreground">
                    Padding: 12-16px vertical<br />
                    Use: Hero CTAs
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge Styles */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Delivery Type Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Badge className="bg-accent-green text-foreground hover:bg-accent-green/90">
                    Blended Learning
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Background: #C4D14F (Accent Green)<br />
                    Text: #124145<br />
                    Use: Online + practical courses
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge className="bg-accent-yellow text-foreground hover:bg-accent-yellow/90">
                    Practical
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Background: #F9D37A (Accent Yellow)<br />
                    Text: #124145<br />
                    Use: Face-to-face sessions
                  </p>
                </div>
                <div className="space-y-2">
                  <Badge variant="outline" className="border-primary text-primary bg-secondary">
                    Online
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Background: Beige<br />
                    Border/Text: #124145<br />
                    Use: Self-paced online
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-heading font-semibold text-foreground mb-3">Status Badges</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Badge variant="default">Default</Badge>
                    <p className="text-xs text-muted-foreground">Primary teal</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="secondary">Secondary</Badge>
                    <p className="text-xs text-muted-foreground">Beige background</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="outline">Outline</Badge>
                    <p className="text-xs text-muted-foreground">Border only</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant="destructive">Warning</Badge>
                    <p className="text-xs text-muted-foreground">Peach accent</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spacing & Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Spacing & Layout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h4 className="font-heading font-semibold text-foreground mb-3">Spacing Scale (8px base)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>xs</span><code>8px</code>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>sm</span><code>16px</code>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>md</span><code>24px</code>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>lg</span><code>32px</code>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/30 rounded">
                    <span>xl</span><code>48px</code>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-heading font-semibold text-foreground mb-3">Layout Guidelines</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Max content width: <code className="bg-muted px-1 rounded">1200px</code></li>
                  <li>• Section spacing: <code className="bg-muted px-1 rounded">48px</code> between sections</li>
                  <li>• Card padding: <code className="bg-muted px-1 rounded">16–24px</code></li>
                  <li>• Border radius: <code className="bg-muted px-1 rounded">8px (rounded-lg)</code></li>
                  <li>• Cards use white surface on beige background</li>
                  <li>• Subtle shadows for elevation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Accessibility Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Focus states use <span className="text-accent-green font-medium">#C4D14F</span> accent green ring</li>
              <li>• Ensure sufficient contrast between text (#124145) and beige background (#F6E5D4)</li>
              <li>• All interactive elements must have visible focus indicators</li>
              <li>• Use semantic HTML and proper heading hierarchy</li>
              <li>• Decorative arcs use <code className="bg-muted px-1 rounded">aria-hidden="true"</code></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BrandSettings;
