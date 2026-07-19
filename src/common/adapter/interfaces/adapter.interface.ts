/**
 * Converts raw persistence models
 * into response DTOs.
 */

export interface Adapter<
  TResponse,
  TRaw = unknown,
> {

  adapt(
    raw: TRaw,
  ): Promise<TResponse>;

  fromArray(
    raws: TRaw[],
  ): Promise<TResponse[]>;

}