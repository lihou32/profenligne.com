import { useState } from 'react';
import { useAdminTutors } from '@/hooks/useAdminTutors';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function AdminTutorsTab() {
  const { data: tutors, isLoading, error, approveTutor, suspendTutor } = useAdminTutors();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const handleToggle = async (id: string, isSuspended: boolean) => {
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      isSuspended ? await approveTutor(id) : await suspendTutor(id);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion des tuteurs</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Gestion des tuteurs</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erreur : {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (tutors.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Gestion des tuteurs</CardTitle></CardHeader>
        <CardContent>
          <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Aucun tuteur inscrit</AlertDescription></Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des tuteurs</CardTitle>
        <CardDescription>{tutors.length} tuteur(s) inscrit(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>En ligne</TableHead>
                <TableHead>Inscrit le</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tutors.map((tutor) => (
                <TableRow key={tutor.id}>
                  <TableCell className="font-medium">
                    {tutor.first_name} {tutor.last_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tutor.email}</TableCell>
                  <TableCell>
                    {tutor.rating
                      ? <Badge variant="outline">⭐ {tutor.rating.toFixed(1)}</Badge>
                      : <Badge variant="secondary">—</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={tutor.is_online ? 'default' : 'secondary'}>
                      {tutor.is_online ? 'En ligne' : 'Hors ligne'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(tutor.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={tutor.is_suspended ? 'outline' : 'destructive'}
                      disabled={loadingIds.has(tutor.id)}
                      onClick={() => handleToggle(tutor.id, tutor.is_suspended)}
                    >
                      {loadingIds.has(tutor.id) ? '...' : tutor.is_suspended ? 'Réactiver' : 'Suspendre'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
