declare module 'kavenegar' {
  interface KavenegarResponse {
    messageid: number;
    message: string;
    status: number;
    statustext: string;
    sender: string;
    receptor: string;
    date: number;
    cost: number;
  }

  interface VerifyLookupParams {
    receptor: string;
    token: string;
    token2?: string;
    token3?: string;
    template: string;
  }

  interface KavenegarApi {
    VerifyLookup(
      params: VerifyLookupParams,
      callback: (response: KavenegarResponse[], status: number, message: string) => void
    ): void;

    Send(
      params: {
        message: string;
        sender: string;
        receptor: string;
      },
      callback: (response: KavenegarResponse[], status: number, message: string) => void
    ): void;

    AccountInfo(
      params: Record<string, unknown>,
      callback: (response: Record<string, unknown>, status: number, message: string) => void
    ): void;
  }

  function KavenegarApi(config: { apikey: string }): KavenegarApi;

  export = { KavenegarApi };
}
