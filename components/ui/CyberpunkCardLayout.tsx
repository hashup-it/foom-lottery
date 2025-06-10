import React from 'react'
import styled from 'styled-components'

const CardWrapper = styled.div`
  padding: 2rem;
  color: #ffffff;
  position: relative;
  overflow: hidden;
  background-image: url('/assets/images/bg.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  font-size: 0.6rem;
`

const Title = styled.h1`
  font-size: 1rem;
  color: #ffffff;
  text-align: center;
  margin-bottom: 1.5rem;
  opacity: 1;
`

const Balance = styled.div`
  font-size: 0.6rem;
  color: #cccccc;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.3rem 0.8rem;
  width: fit-content;
  margin-bottom: 1rem;
  display: flex;
  text-align: start;
`

const InputBox = styled.input`
  background: #111;
  border: none;
  color: #ccc;
  font-size: 0.6rem;
  padding: 1rem;
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
`

const DetailsRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
`

const InfoBlock = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.8rem;
  text-align: center;
`

const Label = styled.div`
  font-size: 0.6rem;
  color: #aaa;
`

const Value = styled.div`
  font-size: 1rem;
  color: #ffffff;
`

const BuyButton = styled.button`
  background: transparent;
  font-size: 0.7rem;
  border: 2px solid #1c9669;
  color: white;
  padding: 0.5rem 0.5rem;
  width: 100%;
  cursor: pointer;
  transition: 0.3s;

  &:hover {
    background-color: rgba(0, 255, 204, 0.1);
  }
`

const Footer = styled.div`
  margin-top: 1.5rem;
  text-align: left;
`

const ReadMoreLink = styled.span`
  color: #00ffcc;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

//export every function from this file
export { CardWrapper, Title, Balance, InputBox, DetailsRow, InfoBlock, Label, Value, BuyButton, Footer, ReadMoreLink }
