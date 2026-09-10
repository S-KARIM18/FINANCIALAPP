// Send tab redirect — actual flow is modal at /send/*
import { Redirect } from 'expo-router';
export default function SendTab() {
  return <Redirect href="/send/recipient" />;
}
