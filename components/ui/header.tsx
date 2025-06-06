import React, { useState } from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background-color: #1e1e1e;  
  color: white;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1),    /* czarny na górze */
    rgba(0, 0, 0, 0)     /* przezroczysty na dole */
  );
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
`;

const Nav = styled.nav`
  display: flex;
  gap: 1.5rem;

  @media (max-width: 768px) {
    display: none;
  }
`;


const Burger = styled.div`
  display: none;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;

  span {
    width: 25px;
    height: 3px;
    background: white;
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileMenu = styled.div<{ open: boolean }>`
  display: ${({ open }) => (open ? 'flex' : 'none')};
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.95);
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: 1rem;

  @media (min-width: 769px) {
    display: none;
  }
`;

const NavButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  padding: 8px 12px;
  transition: background 0.3s ease;
  border-color-bottom:  var(--primary);   
  cursor: pointer;

  &:hover {
    background: #333;
    border-radius: 4px;
  }
`;

const MobileMenus = styled.div` 
  display: ${({ open }) => (open ? 'flex' : 'none')};
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.95);
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  padding: 1rem;

  @media (min-width: 769px) {
    display: none;
  }
`;

const WalletConnect = styled.div`
  background-color: --primary;
  padding: 8px 16px;
  border-radius: 0px;
  font-size: 0.9rem;
  border-color:  var(--primary);   
`;
 
const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);

  return (
    <HeaderContainer>
      <Logo>Foom.Cash</Logo>
      <Nav>
        <NavButton>Lottery</NavButton>
        <NavButton>Liquidity Providing</NavButton>
        <NavButton>Rules</NavButton>
        <NavButton>About</NavButton>
      </Nav>


      <MobileMenus open={menuOpen}>
        <NavButton>Home</NavButton>
        <NavButton>About</NavButton>
        <NavButton>Services</NavButton>
        <NavButton>Contact</NavButton>
      </MobileMenus>


      <WalletConnect>
      <appkit-button />
      </WalletConnect>

      <Burger onClick={() => setMenuOpen(!menuOpen)}>
        <span />
        <span />
        <span />
      </Burger>

    </HeaderContainer>
  );
};

export default Header;
