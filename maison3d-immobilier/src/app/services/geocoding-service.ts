// geocoding.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  geocodeAddress(address: string): Observable<any> {
    const params = {
      q: address,
      format: 'json',
      limit: '1',
      addressdetails: '1'
    };

    return this.http.get(this.NOMINATIM_URL, { params });
  }

  reverseGeocode(lat: number, lng: number): Observable<any> {
    const url = `https://nominatim.openstreetmap.org/reverse`;
    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json'
    };

    return this.http.get(url, { params });
  }
}