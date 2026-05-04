import Api from "./Api";
import { Service } from "./Service";

export class PubService extends Service {
  constructor() {
    super(Api, 'pub');
  }

  async create(data: any): Promise<any> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key] && data[key][0]) {
        formData.append('image', data[key][0].originFileObj);
      } else if (key !== 'image' && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return this.api.post(`/${this.ressource}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res: any) => res.data);
  }

  async update(id: string | number, data: any): Promise<any> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image' && data[key] && data[key][0]) {
        formData.append('image', data[key][0].originFileObj);
      } else if (key !== 'image' && key !== 'existingImage' && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return this.api.patch(`/${this.ressource}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res: any) => res.data);
  }
}