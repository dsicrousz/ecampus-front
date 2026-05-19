import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { message, Spin, Modal, InputNumber } from 'antd';
import {
  FaArrowLeft,
  FaQrcode,
  FaTimes,
  FaWallet,
  FaUser,
  FaIdCard,
  FaPlus,
} from 'react-icons/fa';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import { VendeurService } from '@/services/vendeurservice';
import { useMemo, useState } from 'react';
import { validate } from 'uuid';
import { authClient } from '@/auth/auth-client';
import type { Compte } from '@/types/compte';
import { formatMontant } from '@/types/operation';
import { env } from '@/env';
import { cn } from '@/lib/utils';
import { QUERY_KEYS, queryKeys } from '@/constants';

interface RechargeData {
  compte: string;
  montant: number;
  agentControle: string;
  note: string;
}

export const Route = createFileRoute('/admin/recharge/mobile/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [openedRecharge, setOpenedRecharge] = useState(false);
  const [scannerOpened, setScannerOpened] = useState(false);
  const [montantRecharge, setMontantRecharge] = useState<number>(0);
  const [qr, setQr] = useState<string>();
  
  const qc = useQueryClient();
  const vendeurService = useMemo(() => new VendeurService(), []);
  const compteService = useMemo(() => new CompteService(), []);
  const operationService = useMemo(() => new OperationService(), []);
  
  const soldeVendeurKey = ['solde', session?.user?.id];
  const compteKey = qr
    ? queryKeys.compteByCode(qr)
    : ([QUERY_KEYS.COMPTES, 'code', 'pending'] as const);

  const { data: soldeData, isLoading: isLoadingSolde } = useQuery({
    queryKey: soldeVendeurKey,
    queryFn: () => vendeurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data, isLoading } = useQuery<Compte>({
    queryKey: compteKey,
    queryFn: () => compteService.byCode(qr!),
    enabled: qr !== undefined,
  });

  const { mutate: createRecharge, isPending: isPendingRecharge } = useMutation({
    mutationFn: (data: RechargeData) => operationService.recharge(data),
    onSuccess: () => {
      message.success('Recharge effectuée avec succès');
      setOpenedRecharge(false);
      setMontantRecharge(0);
      setQr(undefined);
      if (qr) {
        qc.invalidateQueries({ queryKey: queryKeys.compteByCode(qr) });
      }
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors de la recharge');
    }
  });

  const handleRecharge = () => {
    if (!montantRecharge || montantRecharge <= 0) {
      message.warning('Veuillez indiquer un montant valide');
      return;
    }

    const rechargeData: RechargeData = {
      compte: data?._id!,
      montant: montantRecharge,
      agentControle: session?.user?.id!,
      note: `Recharge effectuée par ${session?.user?.name}`
    };
    
    createRecharge(rechargeData);
  };

  const openRecharge = () => setOpenedRecharge(true);

  const handleScan = (detectedCodes: any) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      if (code && validate(code)) {
        setQr(code);
        setScannerOpened(false);
      }
    }
  };

  const handleScanError = (error: any) => {
    console.error('Erreur de scan:', error);
  };

  const studentSolde = data?.solde || 0;
  const nouveauSolde = studentSolde + montantRecharge;
  const canValidate = montantRecharge > 0 && !!data;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Spin spinning={isLoading || isLoadingSolde || isPendingRecharge}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => navigate({ to: '/' })}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 active:scale-95"
              aria-label="Retour"
            >
              <FaArrowLeft />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Espace vendeur
              </p>
              <p className="truncate text-sm font-bold text-slate-900">Recharge de comptes</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              En ligne
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-md space-y-4 px-4 pt-4">
          {/* Solde vendeur */}
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Mon solde vendeur
                </p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  {formatMontant(soldeData|| 0)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200">
                <FaWallet className="text-xl" />
              </div>
            </div>
          </section>

          {/* Scan CTA */}
          <button
            type="button"
            onClick={() => setScannerOpened(true)}
            className="group relative flex w-full items-center justify-center gap-3 rounded-3xl bg-violet-600 px-4 py-5 text-base font-bold text-white shadow-lg transition hover:bg-violet-700 active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <FaQrcode className="text-xl" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
                Action principale
              </span>
              <span className="text-lg">Scanner le QR code</span>
            </span>
          </button>

          {/* Carte étudiant ou empty state */}
          {data ? (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-slate-200">
                  {data.etudiant?.avatar ? (
                    <img
                      src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant.avatar}`}
                      alt={`${data.etudiant.prenom} ${data.etudiant.nom}`}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <FaUser />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900">
                    {data.etudiant?.prenom} {data.etudiant?.nom}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <FaIdCard className="text-slate-400" />
                    {data.etudiant?.ncs || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Solde du compte
                  </p>
                  <p className="mt-0.5 text-2xl font-black tracking-tight text-emerald-600">
                    {formatMontant(studentSolde)}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                  <FaWallet />
                </div>
              </div>

              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={openRecharge}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <FaPlus />
                  Recharger le compte
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FaQrcode className="text-3xl" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-700">En attente de scan</p>
              <p className="mt-1 text-xs text-slate-500">
                Scannez un QR code étudiant pour commencer une recharge
              </p>
            </section>
          )}
        </main>

        {/* Modal Scanner */}
        <Modal
          open={scannerOpened}
          onCancel={() => setScannerOpened(false)}
          title={
            <div className="flex items-center gap-2">
              <FaQrcode className="text-violet-600 text-lg" />
              <span className="text-base font-semibold text-slate-800">Scanner le QR Code</span>
            </div>
          }
          width="95%"
          style={{ maxWidth: 500 }}
          centered
          footer={null}
        >
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-500">
              Positionnez le QR code de l'étudiant devant la caméra
            </p>

            <div className="relative aspect-square overflow-hidden rounded-2xl bg-black ring-1 ring-slate-200">
              <Scanner
                onScan={handleScan}
                onError={handleScanError}
                constraints={{ facingMode: 'environment' }}
                components={{ finder: true }}
              />
            </div>

            <button
              type="button"
              onClick={() => setScannerOpened(false)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.98]"
            >
              <FaTimes /> Annuler
            </button>
          </div>
        </Modal>

        {/* Modal Recharge */}
        <Modal
          open={openedRecharge}
          onCancel={() => {
            setOpenedRecharge(false);
            setMontantRecharge(0);
          }}
          title={
            <div className="flex items-center gap-2">
              <FaPlus className="text-emerald-600 text-lg" />
              <span className="text-base font-semibold text-slate-800">Recharge de compte</span>
            </div>
          }
          width="95%"
          style={{ maxWidth: 500 }}
          centered
          footer={null}
        >
          <div className="space-y-3">
            {data && (
              <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-slate-200">
                  {data.etudiant?.avatar ? (
                    <img
                      src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant.avatar}`}
                      alt={`${data.etudiant.prenom} ${data.etudiant.nom}`}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <FaUser />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {data.etudiant?.prenom} {data.etudiant?.nom}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <FaIdCard className="text-slate-400" />
                    {data.etudiant?.ncs || 'N/A'}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Solde :{' '}
                    </span>
                    <span className="font-bold text-emerald-600">
                      {formatMontant(studentSolde)}
                    </span>
                  </p>
                </div>
              </section>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Montant de la recharge
              </label>
              <InputNumber
                size="large"
                min={0}
                step={100}
                placeholder="Entrez le montant"
                value={montantRecharge}
                onChange={(value) => setMontantRecharge(value || 0)}
                style={{ width: '100%', marginTop: 6 }}
                addonAfter="FCFA"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">Montant minimum : 100 FCFA</p>
            </div>

            {canValidate && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Aperçu de la recharge
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-500">Solde actuel</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatMontant(studentSolde)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-500">Montant à ajouter</span>
                    <span className="text-sm font-bold text-blue-600">
                      + {formatMontant(montantRecharge)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-50/40 px-3 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Nouveau solde
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {formatMontant(nouveauSolde)}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpenedRecharge(false);
                  setMontantRecharge(0);
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 active:scale-[0.98]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRecharge}
                disabled={!canValidate || isPendingRecharge}
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md transition active:scale-[0.98]',
                  canValidate && !isPendingRecharge
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-slate-300 shadow-none',
                )}
              >
                {isPendingRecharge ? '...' : '✓ Valider'}
              </button>
            </div>
          </div>
        </Modal>
      </Spin>
    </div>
  );
}
