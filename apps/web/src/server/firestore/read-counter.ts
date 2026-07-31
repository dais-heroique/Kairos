// Compte les opérations Firestore (get()/getAll(), pas les documents
// individuels retournés) déclenchées par le chargement d'une page — c'est
// le pattern N+1 (une requête par ligne de liste) qui explose la facture,
// pas le nombre de documents dans une requête déjà groupée. Voir
// firestore-read-count.test.ts : une page ne doit jamais dépasser 5
// opérations de ce type.
export interface ReadCounter {
  count: number;
  increment(): void;
}

export function createReadCounter(): ReadCounter {
  const counter: ReadCounter = {
    count: 0,
    increment() {
      counter.count += 1;
    },
  };
  return counter;
}
