import type { Operation } from "@/types/operation";
import { observable } from "@legendapp/state";

interface Store {
  operations: Operation[];
  total: number;
  isConnected: boolean;
}

export const store$ = observable<Store>({
  operations: [],
  total: (): number => {
    return store$.operations.length;
  },
  isConnected: false,
});

// Actions séparées pour une meilleure gestion
export const operationActions = {
  setOperations: (ops: Operation[]) => {
    store$.operations.set(ops);
  },
  
  addOperation: (op: Operation) => {
    // Éviter les doublons
    const exists = store$.operations.get().some(o => o._id === op._id);
    if (!exists) {
      store$.operations.unshift(op); // Ajouter en début de liste
    }
  },
  
  updateOperation: (op: Operation) => {
    const index = store$.operations.get().findIndex(o => o._id === op._id);
    if (index !== -1) {
      store$.operations[index].set(op);
    }
  },
  
  removeOperation: (opId: string) => {
    const ops = store$.operations.get().filter(o => o._id !== opId);
    store$.operations.set(ops);
  },
  
  setConnected: (connected: boolean) => {
    store$.isConnected.set(connected);
  },
  
  clear: () => {
    store$.operations.set([]);
  }
};