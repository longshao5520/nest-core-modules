import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { lastValueFrom } from "rxjs";

@Injectable()
export class HttpRequestService {
  constructor(private readonly http: HttpService) {}

  async get<T>(url: string, option: any, config?: AxiosRequestConfig<any>): Promise<T> {
    let requestUrl = url;
    if (option) {
      const query = Object.keys(option)
        .map((key) => `${key}=${option[key]}`)
        .join("&");
      requestUrl = `${url}?${query}`;
    }
    try {
      const observable = this.http.get(requestUrl, config);
      const res = await lastValueFrom(observable);
      return res.data as T;
    } catch (error) {
      return error;
    }
  }

  async post<T>(url: string, option: any, config?: AxiosRequestConfig<any>): Promise<T> {
    try {
      const observable = this.http.post(url, option, config);
      const res = await lastValueFrom(observable);
      return res.data as T;
    } catch (error) {
      return error;
    }
  }
}
