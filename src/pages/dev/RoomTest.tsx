// Page de test locale (seulement en développement) : ouvrir deux onglets sur
// /dev/salle?nom=Eleve et /dev/salle?nom=Prof pour essayer la visio et le
// tableau sans base de données (les onglets se parlent par BroadcastChannel).
import { useMemo } from "react";
import { RoomView } from "@/components/room/RoomView";
import { useRoomTransport } from "@/hooks/useLessonRoom";

export default function RoomTest() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const name = params.get("nom") || "Testeur";
  const room = params.get("salle") || "00000000-0000-0000-0000-000000000000";
  const userId = useMemo(() => `${name}-${Math.random().toString(36).slice(2, 6)}`, [name]);
  const { transport } = useRoomTransport(room, userId, true);
  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <RoomView
        lessonId={room}
        userId={userId}
        selfName={name}
        peerLabel="L'autre testeur"
        names={{}}
        title="Salle de test"
        subtitle="Visio + tableau en local"
        transport={transport}
        joinLabel="Entrer"
        helper="Ouvrez un deuxième onglet sur cette page avec un autre nom."
        onLeave={() => undefined}
        offline
      />
    </div>
  );
}
