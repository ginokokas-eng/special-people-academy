import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from '@/components/icons';
import type { LintCode, LintResult } from '@/lib/contentLint';

/** Human-readable grouping so authors fix one kind of thing at a time. */
const GROUP_TITLES: Record<LintCode, string> = {
  'long-sentence': 'Long sentences',
  'long-paragraph': 'Long paragraphs',
  'missing-alt': 'Pictures without a description',
  'heading-order': 'Heading levels',
  'vague-link': 'Unclear links',
  'all-caps': 'Words in capitals',
  'reading-age': 'Reading age',
  'duration-mismatch': 'Lesson length',
};

const GROUP_ORDER: LintCode[] = [
  'missing-alt',
  'long-sentence',
  'long-paragraph',
  'heading-order',
  'vague-link',
  'all-caps',
  'reading-age',
  'duration-mismatch',
];

interface ContentQualityPanelProps {
  result: LintResult;
}

/**
 * Advisory panel: suggestions only. Nothing here ever blocks saving or
 * publishing — authors decide what to act on.
 */
export function ContentQualityPanel({ result }: ContentQualityPanelProps) {
  const [open, setOpen] = useState(false);
  const warnings = result.issues.filter((i) => i.severity === 'warning');
  const infos = result.issues.filter((i) => i.severity === 'info');

  const groups = GROUP_ORDER.map((code) => ({
    code,
    issues: result.issues.filter((i) => i.code === code),
  })).filter((g) => g.issues.length > 0);

  return (
    <Card data-testid="content-quality">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {warnings.length === 0 ? (
              <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            Content quality
          </CardTitle>
          <CardDescription>
            {warnings.length === 0
              ? 'Nothing to flag. These are suggestions only — they never stop you saving or publishing.'
              : `${warnings.length} ${warnings.length === 1 ? 'suggestion' : 'suggestions'}${
                  infos.length ? ` and ${infos.length} for information` : ''
                }. Suggestions only — they never stop you saving or publishing.`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {result.stats.readingAge > 0 && (
            <Badge variant="secondary">Reading age ~{result.stats.readingAge}</Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-testid="content-quality-toggle"
          >
            {open ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="ml-1">{open ? 'Hide' : 'Show'}</span>
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {result.stats.words} {result.stats.words === 1 ? 'word' : 'words'} ·{' '}
            {result.stats.sentences} {result.stats.sentences === 1 ? 'sentence' : 'sentences'} ·
            longest sentence {result.stats.longestSentence}{' '}
            {result.stats.longestSentence === 1 ? 'word' : 'words'}
          </p>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sentences, pictures and headings all look fine.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.code} className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{GROUP_TITLES[group.code]}</p>
                  <Badge variant="outline">{group.issues.length}</Badge>
                </div>
                <ul className="space-y-2">
                  {group.issues.map((issue, index) => (
                    <li key={`${group.code}-${index}`} className="text-sm text-muted-foreground">
                      {issue.blockIndex >= 0 && (
                        <span className="mr-1 font-medium text-foreground">
                          Block {issue.blockIndex + 1}:
                        </span>
                      )}
                      {issue.message} {issue.hint}
                      {issue.sample && (
                        <span className="mt-0.5 block italic">“{issue.sample}”</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
