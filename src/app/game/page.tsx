'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Layout, Typography, ConfigProvider, theme } from 'antd';
import GameContainer from '@/components/Game/GameContainer';

const { Content, Header, Footer } = Layout;
const { Title } = Typography;

const GamePage: React.FC = () => {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'single';
  const gameId = searchParams.get('gameId') || undefined;
  
  const isMultiplayer = mode === 'multi';

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Batalla Naval
          </Title>
        </Header>
        
        <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <GameContainer isMultiplayer={isMultiplayer} gameId={gameId} />
        </Content>
        
        <Footer style={{ textAlign: 'center' }}>
          Batalla Naval ©{new Date().getFullYear()} Created with Next.js, Ant Design & Three.js
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default GamePage;