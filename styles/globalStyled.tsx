import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: 'PixeloidSans';
    src: url('/fonts/PixeloidSans/PixeloidSans.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap; 
  }

  body {
    font-family: 'PixeloidSans', sans-serif;   
  }
`;