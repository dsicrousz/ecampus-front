import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { AxiosError } from 'axios';
import { Howl } from 'howler';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/auth/auth-client';
import { queryKeys } from '@/constants';
import errorSound from '@/routes/admin/controleurs/error.mp3';
import successSound from '@/routes/admin/controleurs/success.mp3';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import { ServiceService } from '@/services/service.service';
import { TicketService } from '@/services/ticket.service';
import type { Compte } from '@/types/compte';
import type { Operation } from '@/types/operation';
import type { Service } from '@/types/service';
import type { Ticket } from '@/types/ticket';

interface HasConsumedTodayResponse {
  hasConsumed: boolean;
}

interface UseControllerTicketPageParams {
  serviceId: string;
  ticketId: string;
}

export function useControllerTicketPage({
  serviceId,
  ticketId,
}: UseControllerTicketPageParams) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Compte | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const ticketService = useMemo(() => new TicketService(), []);
  const serviceService = useMemo(() => new ServiceService(), []);
  const compteService = useMemo(() => new CompteService(), []);
  const operationService = useMemo(() => new OperationService(), []);

  const successPlayer = useMemo(
    () =>
      new Howl({
        src: [successSound],
        autoplay: false,
      }),
    [],
  );

  const errorPlayer = useMemo(
    () =>
      new Howl({
        src: [errorSound],
        autoplay: false,
      }),
    [],
  );

  const resetStudentSelection = () => {
    setModalOpened(false);
    setStudentData(null);
    setScannedCode(null);
  };

  const ticketQuery = useQuery<Ticket>({
    queryKey: queryKeys.ticketDetail(ticketId),
    queryFn: () => ticketService.getOne(ticketId),
    enabled: !!ticketId,
  });

  const serviceQuery = useQuery<Service>({
    queryKey: queryKeys.serviceDetail(serviceId),
    queryFn: () => serviceService.getOne(serviceId),
    enabled: !!serviceId,
  });

  const operationsQuery = useQuery<Operation[]>({
    queryKey: queryKeys.operationsByTicket(ticketId),
    queryFn: () => operationService.byTicket(ticketId),
    enabled: !!ticketId,
  });

  const hasConsumedTodayQuery = useQuery<HasConsumedTodayResponse>({
    queryKey: studentData
      ? queryKeys.hasConsumedToday(studentData._id, ticketId)
      : ['hasConsumedToday', 'pending', ticketId],
    queryFn: () => operationService.hasConsumedToday(studentData!._id, ticketId),
    enabled: !!studentData && !!ticketId,
  });

  useEffect(() => {
    if (hasConsumedTodayQuery.data?.hasConsumed) {
      message.error("service dAcja utilisAc");
      errorPlayer.play();
    }
  }, [errorPlayer, hasConsumedTodayQuery.data?.hasConsumed]);

  const createUtilisationMutation = useMutation({
    mutationFn: (data: Partial<Operation>) => operationService.utilisation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.operationsByTicket(ticketId),
      });
      successPlayer.play();
      message.success('Utilisation enregistrAce avec succA"s!');
      resetStudentSelection();
    },
    onError: (error: AxiosError) => {
      message.error(error?.message || "Erreur lors de l'utilisation du ticket");
      errorPlayer.play();
      resetStudentSelection();
    },
  });

  const fetchStudentMutation = useMutation({
    mutationFn: (code: string) => compteService.byCode(code),
    onSuccess: (data: Compte) => {
      if (data.est_perdu) {
        message.error('Carte perdue Signalement');
        errorPlayer.play();
      }

      setStudentData(data);
      setModalOpened(true);
    },
    onError: () => {
      message.error("Impossible de rAccupAcrer les informations de l'Actudiant");
      errorPlayer.play();
    },
  });

  const handleDetectedCode = (code: string) => {
    if (
      !code ||
      code.length < 8 ||
      !ticketQuery.data ||
      !serviceQuery.data ||
      fetchStudentMutation.isPending
    ) {
      return;
    }

    setScannedCode(code);
    fetchStudentMutation.mutate(code);
  };

  const handleValidateOperation = () => {
    if (!scannedCode || !studentData || !ticketQuery.data || !serviceQuery.data) {
      return;
    }

    createUtilisationMutation.mutate({
      compte: studentData._id as never,
      montant: ticketQuery.data.prix || 0,
      ticket: ticketId,
      service: serviceId as never,
      agentControle: session?.user?.id as never,
    });
  };

  return {
    ticket: ticketQuery.data,
    service: serviceQuery.data,
    operations: operationsQuery.data,
    studentData,
    modalOpened,
    hasConsumedToday: hasConsumedTodayQuery.data,
    setModalOpened,
    resetStudentSelection,
    handleDetectedCode,
    handleValidateOperation,
    isLoadingTicket: ticketQuery.isLoading,
    isLoadingService: serviceQuery.isLoading,
    isLoadingOperations: operationsQuery.isLoading,
    isLoadingHasConsumedToday: hasConsumedTodayQuery.isLoading,
    isFetchingStudent: fetchStudentMutation.isPending,
    isPendingUtilisation: createUtilisationMutation.isPending,
  };
}
