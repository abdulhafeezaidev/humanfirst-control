import { AssignmentRichTextEditor } from "@/components/assignment/AssignmentRichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssignmentEditorPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Assignment Editor</h1>

        <Card>
          <CardHeader>
            <CardTitle>Your Work</CardTitle>
          </CardHeader>
          <CardContent>
            <AssignmentRichTextEditor
              placeholder="Start typing your assignment…"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
