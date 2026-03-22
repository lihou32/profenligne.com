import { useAdminLessons, type LessonStatus } from '@/hooks/useAdminLessons';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FILTERS: { value: LessonStatus; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'accepted', label: 'Acceptés' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminés' },
  { value: 'cancelled', label: 'Annulés' },
];

const BADGE: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline', accepted: 'secondary', in_progress: 'default',
  completed: 'secondary', cancelled: 'destructive',
};

const LABELS: Record<string, string> = {
  pending: 'En attente', accepted: 'Accepté', in_progress: 'En cours',
  completed: 'Terminé', cancelled: 'Annulé',
};

export function AdminLessonsTab() {
  const { data: lessons, isLoading, error, setStatusFilter } = useAdminLessons();

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Gestion des cours</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Gestion des cours</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erreur : {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des cours</CardTitle>
        <CardDescription>{lessons.length} cours au total</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v as LessonStatus)}>
          <TabsList className="mb-4 grid w-full grid-cols-6">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
            ))}
          </TabsList>
          {FILTERS.map((f) => (
            <TabsContent key={f.value} value={f.value}>
              {lessons.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Aucun cours pour ce filtre</AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tuteur</TableHead>
                        <TableHead>Étudiant</TableHead>
                        <TableHead>Matière</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Prix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{l.id.slice(0, 8)}…</TableCell>
                          <TableCell className="font-medium">{l.tutor_name}</TableCell>
                          <TableCell>{l.student_name}</TableCell>
                          <TableCell>{l.subject}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmt(l.scheduled_at)}</TableCell>
                          <TableCell>{l.duration_minutes ? `${l.duration_minutes}min` : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={BADGE[l.status] || 'outline'}>
                              {LABELS[l.status] || l.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {l.price ? `${l.price.toFixed(2)}€` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
