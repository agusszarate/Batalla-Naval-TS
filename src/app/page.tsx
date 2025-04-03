'use client';

import React from 'react';
import Link from 'next/link';
import { Layout, Typography, Card, Button, Row, Col, Space, ConfigProvider, theme } from 'antd';
import { RocketOutlined, TeamOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Content, Header, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function Home() {
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
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Batalla Naval
          </Title>
        </Header>
        
        <Content style={{ padding: '24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Card 
              style={{ 
                marginBottom: '24px',
                backgroundImage: 'linear-gradient(to right, #1a2a4a, #0d1b2a)',
                borderRadius: '8px'
              }}
              variant="borderless"
            >
              <Row gutter={[24, 24]} align="middle">
                <Col xs={24} md={12}>
                  <Title style={{ color: 'white' }}>
                    Batalla Naval
                  </Title>
                  <Paragraph style={{ color: '#ccc', fontSize: '16px' }}>
                    Un clásico juego de estrategia naval donde debes hundir los barcos de tu oponente
                    antes de que él hunda los tuyos. Juega contra la computadora o desafía a un amigo
                    en modo multijugador en tiempo real.
                  </Paragraph>
                  <Space size="large">
                    <Link href="/game?mode=single">
                      <Button type="primary" icon={<RocketOutlined />} size="large">
                        Jugar Solo
                      </Button>
                    </Link>
                    <Link href="/game?mode=multi">
                      <Button icon={<TeamOutlined />} size="large">
                        Jugar Multijugador
                      </Button>
                    </Link>
                  </Space>
                </Col>
                <Col xs={24} md={12} style={{ textAlign: 'center' }}>
                  <img
                    src="/globe.svg"
                    alt="Batalla Naval"
                    style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px' }}
                  />
                </Col>
              </Row>
            </Card>
            
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <Card title="Estrategia" style={{ height: '100%' }} variant="outlined">
                  <Paragraph>
                    Coloca tus barcos estratégicamente en el tablero. Puedes colocarlos horizontal o
                    verticalmente, pero no en diagonal ni juntos.
                  </Paragraph>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card title="Multijugador" style={{ height: '100%' }} variant="outlined">
                  <Paragraph>
                    Juega contra amigos en tiempo real. Crea una partida y comparte el código para que
                    tu oponente se una a la batalla naval.
                  </Paragraph>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card title="Visualización 3D" style={{ height: '100%' }} variant="outlined">
                  <Paragraph>
                    Disfruta de una experiencia inmersiva con animaciones en 3D que hacen que cada
                    disparo y cada hundimiento sean más emocionantes.
                  </Paragraph>
                </Card>
              </Col>
            </Row>
            
            <Card style={{ marginTop: '24px' }} variant="outlined">
              <Row align="middle" gutter={24}>
                <Col xs={24} md={18}>
                  <Title level={4}>¿Cómo jugar?</Title>
                  <Paragraph>
                    En tu turno, haz clic en una celda del tablero del oponente para disparar.
                    Si aciertas, obtienes un turno adicional. ¡El primero en hundir todos los barcos
                    enemigos gana!
                  </Paragraph>
                </Col>
                <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                  <Button type="primary" icon={<InfoCircleOutlined />}>
                    Ver Reglas Completas
                  </Button>
                </Col>
              </Row>
            </Card>
          </div>
        </Content>
        
        <Footer style={{ textAlign: 'center' }}>
          Batalla Naval ©{new Date().getFullYear()} Created with Next.js, Ant Design & Three.js
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}
