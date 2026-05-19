import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Button, Modal, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient,
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const PWA_INSTALL_DISMISSED_KEY = 'ecampus-pwa-install-dismissed'

const isStandaloneMode = () => {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = 'standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone
  return standalone || Boolean(iosStandalone)
}

function PwaInstallModal() {
  const [open, setOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandaloneMode()) return
    if (localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === 'true') return

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setOpen(true)
    }

    const onAppInstalled = () => {
      setOpen(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true')
    setOpen(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true')
    }
    setOpen(false)
    setDeferredPrompt(null)
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width={460}
      title="Installer E-Campus"
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Text>
          Installez l'application pour un accès rapide, une meilleure expérience et un lancement direct depuis l'écran d'accueil.
        </Typography.Text>
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={handleClose}>Plus tard</Button>
          <Button type="primary" onClick={handleInstall}>
            Installer
          </Button>
        </Space>
      </Space>
    </Modal>
  )
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <PwaInstallModal />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          TanStackQueryDevtools,
        ]}
      />
    </>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})
